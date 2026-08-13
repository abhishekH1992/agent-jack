-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'admin', 'superadmin');

-- Convert existing admins to superadmin, then switch the column type
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING (
    CASE
      WHEN role IN ('admin', 'superadmin') THEN 'superadmin'::"UserRole"
      ELSE 'customer'::"UserRole"
    END
  );

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'customer';
