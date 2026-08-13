import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SERVER_ROOT, "..");
const TMP =
  [
    path.join(SERVER_ROOT, "tmp"),
    path.join(REPO_ROOT, "tmp"),
  ].find((dir) => fs.existsSync(dir)) || path.join(REPO_ROOT, "tmp");
const PUBLIC_UPLOADS =
  process.env.UPLOAD_DIR ||
  [
    path.join(REPO_ROOT, "public", "uploads"),
    path.join(SERVER_ROOT, "public", "uploads"),
  ].find((dir) => fs.existsSync(path.dirname(dir))) ||
  path.join(REPO_ROOT, "public", "uploads");

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "password-qr";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function randPrice(min = 8, max = 18) {
  return Number((min + Math.random() * (max - min)).toFixed(2));
}

/** Copy from tmp/<folder>/<slug>.png → public/uploads/<folder>/ and return public URL. */
function useTmpImage(
  folder: "category" | "subcategory" | "menu" | "banner",
  nameOrFile: string,
): string {
  const file = nameOrFile.endsWith(".png")
    ? nameOrFile
    : `${slugify(nameOrFile)}.png`;
  const destFolder = folder === "banner" ? "banners" : folder;
  const src = path.join(TMP, folder === "banner" ? "banner" : folder, file);
  if (fs.existsSync(src)) {
    const destDir = path.join(PUBLIC_UPLOADS, destFolder);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, path.join(destDir, file));
  }
  return `/uploads/${destFolder}/${file}`;
}

async function ensureClerkAdmin(): Promise<string> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    console.warn("CLERK_SECRET_KEY missing — seeding DB admin with local clerkId");
    return `local-admin-${ADMIN_EMAIL}`;
  }

  const headers = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };

  const listRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(ADMIN_EMAIL)}`,
    { headers },
  );
  if (listRes.ok) {
    const listed = (await listRes.json()) as Array<{ id: string }>;
    if (listed[0]?.id) {
      const id = listed[0].id;
      await fetch(`https://api.clerk.com/v1/users/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          password: ADMIN_PASSWORD,
          skip_password_checks: true,
          public_metadata: { role: "admin" },
          first_name: "Admin",
        }),
      });
      console.log(`Clerk admin updated: ${ADMIN_EMAIL}`);
      return id;
    }
  }

  const createRes = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email_address: [ADMIN_EMAIL],
      password: ADMIN_PASSWORD,
      skip_password_checks: true,
      first_name: "Admin",
      last_name: "User",
      public_metadata: { role: "admin" },
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    console.warn(`Clerk admin create failed (${createRes.status}): ${body}`);
    return `local-admin-${ADMIN_EMAIL}`;
  }

  const created = (await createRes.json()) as { id: string };
  console.log(`Clerk admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  return created.id;
}

type SubSeed = {
  name: string;
  menu: string[];
  addons: string[];
  variant: { name: string; price: number }[];
  liquor?: boolean;
};

type CatSeed = {
  category: string;
  type: "Food" | "Liquor";
  sub: SubSeed[];
};

const menuTree: CatSeed[] = [
  {
    category: "THE BASICS",
    type: "Food",
    sub: [
      {
        name: "SANDWICH",
        menu: [
          "VEG GRILLED",
          "CHEESE GRILLED",
          "VEG CLUB GRILLED",
          "CHICKEN GRILLED",
          "LAMB GRILLED",
        ],
        addons: ["Extra Cheese", "Extra Meat", "Extra Sauce", "Peri-Peri"],
        variant: [
          { name: "Small", price: 0 },
          { name: "Large", price: 2 },
        ],
      },
      {
        name: "TOAST",
        menu: ["CHEESE TOAST", "AVACADO TOAST"],
        addons: ["Extra Cheese", "Extra Avocado", "Peri-Peri"],
        variant: [
          { name: "Small", price: 0 },
          { name: "Large", price: 2 },
        ],
      },
      {
        name: "PANCAKE",
        menu: ["KIWI PANCAKE", "ENGLISH PANCAKE WITH LEMON AND SUGAR"],
        addons: ["Extra Honey", "Maple Syrup"],
        variant: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 2 },
          { name: "Large", price: 4 },
        ],
      },
      {
        name: "BURGER",
        menu: [
          "VEG BURGER",
          "VEG CHEESE BURGER",
          "CHICKEN BURGER",
          "CHICKEN CHEESE BURGER",
          "HAMBURGER",
          "LAMB BURGER",
        ],
        addons: ["Extra Cheese", "Extra Meat", "Extra Fries", "Peri-Peri"],
        variant: [
          { name: "Only Burger", price: 0 },
          { name: "With Fries", price: 2 },
          { name: "Combo Meal", price: 4 },
        ],
      },
      {
        name: "PIZZA",
        menu: [
          "CHEESE LOVER",
          "CHIPOTLE CHICKEN",
          "PESTO CHICKEN",
          "CHICKEN BBQ",
          "CHICKEN SLINGSHOT",
          "CHICKEN PERI PERI",
          "MEAT LOVERS",
          "BBQ BEEF AND MEAT",
          "HOT AND SPICY BEEF",
          "KIWI SUPRIME",
          "GARLIC LAMB AND PEPPER",
        ],
        addons: ["Extra Cheese", "Extra Meat", "Extra Spicy"],
        variant: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 3 },
          { name: "Large", price: 6 },
        ],
      },
    ],
  },
  {
    category: "SPECIALITY",
    type: "Food",
    sub: [
      {
        name: "PASTA",
        menu: [
          "CHEESE SAUSAGE PASTA",
          "CHICKEN ALFREDO",
          "BIG KALE PASTA SALAD",
          "MACARONI SALAD",
        ],
        addons: ["Extra Cheese", "Extra Meat"],
        variant: [
          { name: "Regular", price: 0 },
          { name: "Large", price: 3 },
        ],
      },
      {
        name: "SUSHI",
        menu: ["ABURI SALMON DRAGON ROLL", "AVACADO MAKI", "BEEF TERIYAKI"],
        addons: ["Extra Sauce"],
        variant: [
          { name: "6 Pieces", price: 0 },
          { name: "8 Pieces", price: 3 },
          { name: "12 Pieces", price: 6 },
        ],
      },
      {
        name: "EGGS",
        menu: ["SUNNY SIDE UP FRIED EGGS", "CRISPY FRIED EGGS"],
        addons: [],
        variant: [
          { name: "Small", price: 0 },
          { name: "Large", price: 2 },
        ],
      },
    ],
  },
  {
    category: "COFFEE",
    type: "Food",
    sub: [
      {
        name: "CREAM ON TOP",
        menu: ["FRAPPUCCINO", "WHIPPED CREAM", "VANILLA ON TOP"],
        addons: ["Extra Cream"],
        variant: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 1 },
          { name: "Large", price: 2 },
        ],
      },
      {
        name: "COFFEE",
        menu: ["BLACK COFFEE", "COFFEE WITH MILK"],
        addons: [],
        variant: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 1 },
          { name: "Large", price: 2 },
        ],
      },
    ],
  },
  {
    category: "TEA",
    type: "Food",
    sub: [
      {
        name: "TEA",
        menu: ["LEMON TEA", "TEA WITH MILK"],
        addons: [],
        variant: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 1 },
          { name: "Large", price: 2 },
        ],
      },
      {
        name: "BUBBLE TEA",
        menu: ["BLACKBERRY BUBBLE TEA", "CLASSIC"],
        addons: [],
        variant: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 1 },
          { name: "Large", price: 2 },
        ],
      },
    ],
  },
  {
    category: "LIQUOR",
    type: "Liquor",
    sub: [
      {
        name: "BEER",
        menu: ["STELLA", "BUDWEISER", "HEINEKEN", "TIGER"],
        addons: [],
        variant: [],
        liquor: true,
      },
    ],
  },
];

const CUSTOMERS = [
  { name: "Aria Patel", email: "aria.patel@example.com" },
  { name: "Liam Chen", email: "liam.chen@example.com" },
  { name: "Sophie Williams", email: "sophie.williams@example.com" },
  { name: "Noah Singh", email: "noah.singh@example.com" },
  { name: "Mia Thompson", email: "mia.thompson@example.com" },
  { name: "Jack Morrison", email: "jack.morrison@example.com" },
  { name: "Olivia Kumar", email: "olivia.kumar@example.com" },
  { name: "Ethan Baker", email: "ethan.baker@example.com" },
  { name: "Isla Nguyen", email: "isla.nguyen@example.com" },
  { name: "Lucas Fraser", email: "lucas.fraser@example.com" },
];

const KITCHEN_NOTES = [
  "No peanuts",
  "Extra spicy",
  "Cutlery for a child",
  "Allergy: gluten — no wheat bun",
  "No ice in drinks",
  "Well done on the burger",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(p: number) {
  return Math.random() < p;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function randomPastDate(maxDays: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * maxDays));
  d.setHours(11 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

async function seedCustomersAndHistory(coffeeStampIds: string[]) {
  const stampSet = new Set(coffeeStampIds);

  const coupons = await Promise.all([
    prisma.coupon.create({
      data: {
        code: "JACK10",
        percentOff: 10,
        minSpendNzd: 50,
        maxDiscountNzd: 15,
        allowWithRewards: false,
        applyOn: "FOOD",
        isActive: true,
      },
    }),
    prisma.coupon.create({
      data: {
        code: "JACK15",
        percentOff: 15,
        minSpendNzd: 30,
        maxDiscountNzd: 20,
        allowWithRewards: true,
        applyOn: "BOTH",
        isActive: true,
      },
    }),
    prisma.coupon.create({
      data: {
        code: "PINT10",
        percentOff: 10,
        minSpendNzd: 12,
        maxDiscountNzd: 8,
        allowWithRewards: true,
        applyOn: "LIQUOR",
        isActive: true,
      },
    }),
    prisma.coupon.create({
      data: {
        code: "WELCOME",
        percentOff: 10,
        minSpendNzd: 0,
        maxDiscountNzd: 10,
        allowWithRewards: true,
        applyOn: "BOTH",
        isActive: true,
      },
    }),
  ]);

  const tables = await prisma.table.findMany();
  const menus = await prisma.menu.findMany({
    include: {
      addons: true,
      variants: true,
      subCategory: { include: { category: { include: { categoryType: true } } } },
    },
  });
  const foodMenus = menus.filter(
    (m) =>
      (m.subCategory.category.categoryType?.name || "").toLowerCase() === "food",
  );
  const liquorMenus = menus.filter(
    (m) =>
      (m.subCategory.category.categoryType?.name || "").toLowerCase() ===
      "liquor",
  );
  const stampMenus = menus.filter((m) => stampSet.has(m.id));

  const users = [];
  for (const customer of CUSTOMERS) {
    const user = await prisma.user.create({
      data: {
        clerkId: `local-customer-${customer.email}`,
        email: customer.email,
        name: customer.name,
        role: "customer",
        reward: { create: { pointsBalance: 0, stampsBalance: 0 } },
      },
    });
    users.push(user);
  }

  let orderSeq = 1;
  let paidCount = 0;
  let couponCount = 0;
  let pointsRedeemCount = 0;
  let stampRedeemCount = 0;

  for (const user of users) {
    let points = 0;
    let stamps = 0;
    const orderCount = 5 + Math.floor(Math.random() * 8);
    const dates = Array.from({ length: orderCount }, () => randomPastDate(90)).sort(
      (a, b) => a.getTime() - b.getTime(),
    );

    for (const createdAt of dates) {
      const statusRoll = Math.random();
      const status =
        statusRoll < 0.72
          ? "FULFILLED"
          : statusRoll < 0.9
            ? "PAID"
            : statusRoll < 0.97
              ? "CANCELLED"
              : "PENDING";
      const paid = status === "PAID" || status === "FULFILLED";

      const lineCount = 1 + Math.floor(Math.random() * 4);
      const includeStamp = stampMenus.length > 0 && chance(0.7);
      const picked: typeof menus = [];
      if (includeStamp) picked.push(pick(stampMenus));
      while (picked.length < lineCount) {
        const pool = chance(0.25) && liquorMenus.length ? liquorMenus : foodMenus;
        picked.push(pick(pool.length ? pool : menus));
      }

      const lines = picked.map((menu) => {
        const variant =
          menu.variants.length && chance(0.45) ? pick(menu.variants) : null;
        const addon =
          menu.addons.length && chance(0.3) ? pick(menu.addons) : null;
        const quantity = 1 + Math.floor(Math.random() * 2);
        const salePrice = Number(variant?.price ?? menu.currentPrice ?? menu.fixedPrice);
        return { menu, variant, addon, quantity, salePrice };
      });

      const catalogTotal = (applyOn: "FOOD" | "LIQUOR" | "BOTH") =>
        round2(
          lines.reduce((sum, line) => {
            const type = (
              line.menu.subCategory.category.categoryType?.name || ""
            ).toLowerCase();
            if (applyOn === "FOOD" && type !== "food") return sum;
            if (applyOn === "LIQUOR" && type !== "liquor") return sum;
            const unit = line.salePrice + Number(line.addon?.price || 0);
            return sum + unit * line.quantity;
          }, 0),
        );

      const subtotal = catalogTotal("BOTH");
      let stampRedeemed = false;
      let stampMenuId: string | null = null;
      let stampFree = 0;
      let pointsRedeemed = 0;
      let pointsDiscountNzd = 0;
      let coupon = null as (typeof coupons)[number] | null;
      let couponDiscountNzd = 0;

      if (paid) {
        const stampLine = lines.find((l) => stampSet.has(l.menu.id));
        if (stamps >= 9 && stampLine && chance(0.8)) {
          stampRedeemed = true;
          stampMenuId = stampLine.menu.id;
          stampFree = stampLine.salePrice + Number(stampLine.addon?.price || 0);
          stamps -= 9;
          stampRedeemCount += 1;
        }

        if (points >= 100 && chance(0.4)) {
          pointsRedeemed = 100;
          pointsDiscountNzd = 5;
          points -= 100;
          pointsRedeemCount += 1;
        }

        const rewardsUsed = stampRedeemed || pointsRedeemed > 0;
        if (chance(0.38)) {
          const candidates = coupons.filter((c) => {
            if (rewardsUsed && !c.allowWithRewards) return false;
            const applyOn = c.applyOn as "FOOD" | "LIQUOR" | "BOTH";
            const base = catalogTotal(applyOn);
            return base >= Number(c.minSpendNzd) && base > 0;
          });
          if (candidates.length) {
            coupon = pick(candidates);
            const applyOn = coupon.applyOn as "FOOD" | "LIQUOR" | "BOTH";
            const base = catalogTotal(applyOn);
            const raw = round2((base * Number(coupon.percentOff)) / 100);
            const cap =
              coupon.maxDiscountNzd == null
                ? raw
                : Math.min(raw, Number(coupon.maxDiscountNzd));
            const remaining = Math.max(0.5, subtotal - stampFree - pointsDiscountNzd);
            couponDiscountNzd = round2(Math.min(cap, remaining - 0.5));
            if (couponDiscountNzd > 0) couponCount += 1;
            else {
              coupon = null;
              couponDiscountNzd = 0;
            }
          }
        }
      }

      const totalAmount = round2(
        Math.max(0.5, subtotal - stampFree - pointsDiscountNzd - couponDiscountNzd),
      );
      const orderNumber = `AJ-SEED-${String(orderSeq).padStart(5, "0")}`;
      orderSeq += 1;

      const stampsEarned = paid
        ? lines.reduce((sum, line) => {
            if (!stampSet.has(line.menu.id)) return sum;
            let qty = line.quantity;
            if (stampRedeemed && line.menu.id === stampMenuId) qty = Math.max(0, qty - 1);
            return sum + qty;
          }, 0)
        : 0;
      const pointsEarned = paid
        ? Math.floor(Math.max(0, subtotal - stampFree - pointsDiscountNzd))
        : 0;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          note: chance(0.22) ? pick(KITCHEN_NOTES) : null,
          tableId: tables.length ? pick(tables).id : null,
          userId: user.id,
          guestName: user.name,
          guestEmail: user.email,
          status,
          totalAmount,
          pointsRedeemed,
          pointsDiscountNzd,
          couponId: coupon?.id || null,
          couponCode: coupon?.code || null,
          couponDiscountNzd,
          stampRedeemed,
          stampMenuId,
          pointsEarned,
          stampsEarned,
          createdAt,
          updatedAt: createdAt,
          items: {
            create: lines.map((line) => ({
              menuId: line.menu.id,
              menuVariantId: line.variant?.id || null,
              quantity: line.quantity,
              salePrice: line.salePrice,
              addons: line.addon
                ? { create: [{ menuAddonId: line.addon.id }] }
                : undefined,
            })),
          },
        },
      });

      if (!paid) continue;
      paidCount += 1;

      if (pointsRedeemed > 0) {
        await prisma.rewardLedger.create({
          data: {
            userId: user.id,
            orderId: order.id,
            type: "REDEEM_POINTS",
            pointsDelta: -pointsRedeemed,
            note: `Redeemed ${pointsRedeemed} points on ${orderNumber}`,
            createdAt,
          },
        });
      }
      if (stampRedeemed) {
        await prisma.rewardLedger.create({
          data: {
            userId: user.id,
            orderId: order.id,
            type: "REDEEM_STAMP",
            stampsDelta: -9,
            note: `Redeemed 9 stamps for 1 free item on ${orderNumber}`,
            createdAt,
          },
        });
      }
      if (pointsEarned > 0) {
        points += pointsEarned;
        await prisma.rewardLedger.create({
          data: {
            userId: user.id,
            orderId: order.id,
            type: "EARN_POINTS",
            pointsDelta: pointsEarned,
            note: `Earned ${pointsEarned} points on ${orderNumber}`,
            createdAt,
          },
        });
      }
      if (stampsEarned > 0) {
        stamps += stampsEarned;
        await prisma.rewardLedger.create({
          data: {
            userId: user.id,
            orderId: order.id,
            type: "EARN_STAMP",
            stampsDelta: stampsEarned,
            note: `Earned ${stampsEarned} stamp${stampsEarned === 1 ? "" : "s"} on ${orderNumber}`,
            createdAt,
          },
        });
      }

      await prisma.userReward.update({
        where: { userId: user.id },
        data: { pointsBalance: points, stampsBalance: stamps },
      });
    }
  }

  console.log(
    `Seeded ${users.length} customers, ${orderSeq - 1} orders (${paidCount} paid), ${couponCount} coupons, ${pointsRedeemCount} point redemptions, ${stampRedeemCount} stamp redemptions`,
  );
}

async function main() {
  // Wipe
  await prisma.rewardLedger.deleteMany();
  await prisma.userReward.deleteMany();
  await prisma.rewardStampMenu.deleteMany();
  await prisma.rewardSettings.deleteMany();
  await prisma.bidAttempt.deleteMany();
  await prisma.priceEvent.deleteMany();
  await prisma.orderItemAddon.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.cartItemAddon.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.comboItem.deleteMany();
  await prisma.combo.deleteMany();
  await prisma.pageBlock.deleteMany();
  await prisma.page.deleteMany();
  await prisma.beltItem.deleteMany();
  await prisma.belt.deleteMany();
  await prisma.menuAddon.deleteMany();
  await prisma.menuVariant.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.categoryType.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.site.deleteMany();

  const banners = ["1.png", "2.png", "3.png"]
    .map((f) => useTmpImage("banner", f))
    .filter((x): x is string => Boolean(x));

  await prisma.site.create({
    data: {
      name: "Agent Jack",
      email: "hello@agentjack.local",
      logo: null,
      banners,
    },
  });

  const tableNames = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "D1", "D2"];
  for (const name of tableNames) {
    await prisma.table.create({ data: { name } });
  }

  const foodType = await prisma.categoryType.create({ data: { name: "Food" } });
  const liquorType = await prisma.categoryType.create({
    data: { name: "Liquor" },
  });

  const clerkId = await ensureClerkAdmin();
  await prisma.user.create({
    data: {
      clerkId,
      email: ADMIN_EMAIL,
      name: "Admin",
      role: "admin",
    },
  });
  console.log(`DB admin user: ${ADMIN_EMAIL} (role=admin)`);

  let basicsCategoryId = "";
  let basicsCategorySlug = "";
  let burgerSubCategoryId = "";
  let pancakeSubCategoryId = "";
  let liquorCategoryId = "";
  const burgerMenuIds: string[] = [];
  const pizzaMenuIds: string[] = [];
  const coffeeStampIds: string[] = [];

  for (const block of menuTree) {
    const categorySlug = slugify(block.category);
    const category = await prisma.category.create({
      data: {
        name: block.category,
        slug: categorySlug,
        image: useTmpImage("category", block.category),
        isEnable: true,
        categoryTypeId: block.type === "Liquor" ? liquorType.id : foodType.id,
      },
    });
    if (block.category === "THE BASICS") {
      basicsCategoryId = category.id;
      basicsCategorySlug = categorySlug;
    }
    if (block.category === "LIQUOR") liquorCategoryId = category.id;

    for (const sub of block.sub) {
      const subCategory = await prisma.subCategory.create({
        data: {
          name: sub.name,
          image: useTmpImage("subcategory", sub.name),
          isEnable: true,
          categoryId: category.id,
        },
      });
      if (sub.name === "BURGER") burgerSubCategoryId = subCategory.id;
      if (sub.name === "PANCAKE") pancakeSubCategoryId = subCategory.id;

      for (const menuName of sub.menu) {
        const base = sub.liquor ? randPrice(6, 11) : randPrice(10, 22);
        const image = useTmpImage("menu", menuName);
        const menu = await prisma.menu.create({
          data: {
            name: menuName,
            description: sub.liquor
              ? `Ice-cold ${menuName}. Bid with the room — price moves with demand.`
              : `House favourite ${menuName.toLowerCase()}`,
            image,
            fixedPrice: base,
            lowestPrice: sub.liquor ? base : null,
            highestPrice: sub.liquor ? Number((base + 5).toFixed(2)) : null,
            currentPrice: base,
            step: sub.liquor ? 0.5 : null,
            unitsPerStep: sub.liquor ? 5 : 5,
            demandUnits: 0,
            pricingEnabled: Boolean(sub.liquor),
            isEnable: true,
            subCategoryId: subCategory.id,
            tags: sub.liquor ? ["liquor", "beer"] : ["food"],
            variants:
              sub.variant.length > 0
                ? {
                    create: sub.variant.map((v) => ({
                      name: v.name,
                      price: Number((base + v.price).toFixed(2)),
                    })),
                  }
                : undefined,
            addons:
              sub.addons.length > 0
                ? {
                    create: sub.addons.map((name) => ({
                      name,
                      price: Number((1 + Math.random() * 3).toFixed(2)),
                    })),
                  }
                : undefined,
          },
        });
        if (sub.name === "BURGER") burgerMenuIds.push(menu.id);
        if (sub.name === "PIZZA") pizzaMenuIds.push(menu.id);
        if (sub.name === "COFFEE") coffeeStampIds.push(menu.id);
      }
    }
  }

  if (burgerMenuIds[0]) {
    const burger = await prisma.menu.findUnique({
      where: { id: burgerMenuIds[0] },
      include: { variants: true },
    });
    if (burger) {
      await prisma.combo.create({
        data: {
          name: "Burger + Fries Deal",
          description: "Any classic burger combo for less",
          image: burger.image,
          price: Number((Number(burger.fixedPrice) + 3).toFixed(2)),
          isEnable: true,
          items: {
            create: [
              {
                menuId: burger.id,
                menuVariantId: burger.variants[0]?.id,
                quantity: 1,
              },
            ],
          },
        },
      });
    }
  }

  const basicsBelt = await prisma.belt.create({
    data: {
      name: "The Basics",
      sourceType: "CATEGORY",
      categoryId: basicsCategoryId,
      isSlider: false,
      isEnable: true,
      sortOrder: 0,
    },
  });

  const burgersBelt = await prisma.belt.create({
    data: {
      name: "Burgers",
      sourceType: "SUBCATEGORY",
      subCategoryId: burgerSubCategoryId,
      isSlider: true,
      isEnable: true,
      sortOrder: 1,
    },
  });

  const chefBelt = await prisma.belt.create({
    data: {
      name: "Chef picks",
      sourceType: "MENUS",
      isSlider: false,
      isEnable: true,
      sortOrder: 2,
      items: {
        create: [...pizzaMenuIds.slice(0, 2), ...burgerMenuIds.slice(0, 2)].map(
          (menuId, index) => ({ menuId, sortOrder: index }),
        ),
      },
    },
  });

  let liquorBeltId: string | null = null;
  if (liquorCategoryId) {
    const liquorBelt = await prisma.belt.create({
      data: {
        name: "On tap — live prices",
        sourceType: "CATEGORY",
        categoryId: liquorCategoryId,
        isSlider: true,
        isEnable: true,
        sortOrder: 3,
      },
    });
    liquorBeltId = liquorBelt.id;
  }

  // CMS pages — belts attach here
  await prisma.page.create({
    data: {
      title: "Home",
      slug: "home",
      isEnable: true,
      sortOrder: 0,
      blocks: {
        create: [
          {
            type: "IMAGE",
            sortOrder: 0,
            isEnable: true,
            images: banners,
            imageLayout: "SLIDER",
            isBanner: true,
            content: JSON.stringify({
              slides: banners.map((src, i) => ({
                src,
                header: "Bid · Order · Feast",
                subheader:
                  "Live liquor prices and table ordering — right from your seat.",
                buttons:
                  i === 0
                    ? [
                        {
                          label: "Pancake",
                          href:
                            pancakeSubCategoryId && basicsCategorySlug
                              ? `/menu?category=${encodeURIComponent(basicsCategorySlug)}&sub=${encodeURIComponent(pancakeSubCategoryId)}`
                              : "/menu",
                          variant: "primary",
                        },
                      ]
                    : i === 1
                      ? [{ label: "View cart", href: "/cart", variant: "secondary" }]
                      : [
                          {
                            label: "Order now",
                            href: "/menu",
                            variant: "primary",
                          },
                        ],
              })),
            }),
            buttons: [],
          },
          {
            type: "BELT",
            sortOrder: 1,
            isEnable: true,
            beltId: basicsBelt.id,
          },
          {
            type: "BELT",
            sortOrder: 2,
            isEnable: true,
            beltId: burgersBelt.id,
          },
          {
            type: "BELT",
            sortOrder: 3,
            isEnable: true,
            beltId: chefBelt.id,
          },
          ...(liquorBeltId
            ? [
                {
                  type: "BELT" as const,
                  sortOrder: 4,
                  isEnable: true,
                  beltId: liquorBeltId,
                },
              ]
            : []),
        ],
      },
    },
  });

  await prisma.page.create({
    data: {
      title: "Menu",
      slug: "menu",
      isEnable: true,
      sortOrder: 1,
      blocks: {
        create: [
          {
            type: "MENU_BROWSE",
            sortOrder: 0,
            isEnable: true,
            content: JSON.stringify({
              catalog: "food",
              showCategory: true,
              showSubcategory: true,
            }),
          },
        ],
      },
    },
  });

  await prisma.page.create({
    data: {
      title: "Liquor",
      slug: "liquor",
      isEnable: true,
      sortOrder: 2,
      blocks: {
        create: [
          {
            type: "MENU_BROWSE",
            sortOrder: 0,
            isEnable: true,
            content: JSON.stringify({
              catalog: "liquor",
              showCategory: true,
              showSubcategory: true,
            }),
          },
        ],
      },
    },
  });

  await prisma.page.create({
    data: {
      title: "Privacy Policy",
      slug: "privacy-policy",
      isEnable: true,
      sortOrder: 0,
      blocks: {
        create: [
          {
            type: "RICH_TEXT",
            sortOrder: 0,
            isEnable: true,
            content: `
<h2>Privacy Policy</h2>
<p>Agent Jack ("we", "us") respects your privacy when you order from our restaurant via QR codes and our web app.</p>
<h3>Information we collect</h3>
<ul>
  <li>Table and order details you submit at checkout</li>
  <li>Optional account details if you sign in (name, email)</li>
  <li>Device and usage data needed to run bidding and payments</li>
</ul>
<h3>How we use information</h3>
<p>We use your information to process orders, take payments, improve the menu experience, and meet legal obligations.</p>
<h3>Sharing</h3>
<p>We share data with payment providers (e.g. Stripe) and authentication providers (e.g. Clerk) only as needed to operate the service.</p>
<h3>Contact</h3>
<p>Questions? Email <a href="mailto:hello@agentjack.local">hello@agentjack.local</a>.</p>
`.trim(),
          },
        ],
      },
    },
  });

  await prisma.page.create({
    data: {
      title: "Terms and Conditions",
      slug: "terms-and-conditions",
      isEnable: true,
      sortOrder: 0,
      blocks: {
        create: [
          {
            type: "RICH_TEXT",
            sortOrder: 0,
            isEnable: true,
            content: `
<h2>Terms and Conditions</h2>
<p>By using Agent Jack ordering and liquor bidding, you agree to these terms.</p>
<h3>Orders & payment</h3>
<p>Prices shown at checkout are final for food items. Liquor bid prices may change with demand until your bid succeeds. Payment is processed securely via our payment provider.</p>
<h3>Table responsibility</h3>
<p>Orders placed from a table QR are associated with that table. Please confirm your table before paying.</p>
<h3>Acceptable use</h3>
<p>Do not abuse bidding, attempt to interfere with pricing systems, or misuse other guests' sessions.</p>
<h3>Changes</h3>
<p>We may update these terms from time to time. Continued use of the service means you accept the updated terms.</p>
`.trim(),
          },
        ],
      },
    },
  });

  await prisma.rewardSettings.create({
    data: {
      enabled: true,
      pointsPerDollar: 1,
      pointsToRedeem: 100,
      rewardAmountNzd: 5,
      redeemOn: "BOTH",
      stampsEnabled: true,
      stampsRequired: 9,
      stampMenus: {
        create: coffeeStampIds.map((menuId) => ({ menuId })),
      },
    },
  });

  await seedCustomersAndHistory(coffeeStampIds);

  console.log("Seed complete (pages + tmp images → public/uploads)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
