import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function randPrice(min = 8, max = 18) {
  return Number((min + Math.random() * (max - min)).toFixed(2));
}

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.bidAttempt.deleteMany();
  await prisma.priceEvent.deleteMany();
  await prisma.orderItemAddon.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItemAddon.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.comboItem.deleteMany();
  await prisma.combo.deleteMany();
  await prisma.beltItem.deleteMany();
  await prisma.belt.deleteMany();
  await prisma.menuAddon.deleteMany();
  await prisma.menuVariant.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.categoryType.deleteMany();
  await prisma.table.deleteMany();
  await prisma.site.deleteMany();

  await prisma.site.create({
    data: {
      name: "Agent Jack",
      email: "hello@agentjack.local",
      logo: "/logo.png",
      banners: [],
    },
  });

  const tableNames = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "D1", "D2"];
  for (const name of tableNames) {
    await prisma.table.create({ data: { name } });
  }

  const foodType = await prisma.categoryType.create({ data: { name: "Food" } });
  const liquorType = await prisma.categoryType.create({ data: { name: "Liquor" } });

  const foodTree = [
    {
      category: "THE BASICS",
      sub: [
        {
          name: "BURGER",
          menu: ["VEG BURGER", "CHICKEN BURGER", "HAMBURGER", "LAMB BURGER"],
          addons: ["Extra Cheese", "Extra Meat", "Extra Fries", "Peri-Peri"],
          variant: [
            { name: "Only Burger", price: 0 },
            { name: "With Fries", price: 2 },
            { name: "Combo Meal", price: 4 },
          ],
        },
        {
          name: "PIZZA",
          menu: ["CHEESE LOVER", "CHICKEN BBQ", "MEAT LOVERS", "KIWI SUPREME"],
          addons: ["Extra Cheese", "Extra Meat", "Extra Spicy"],
          variant: [
            { name: "Small", price: 0 },
            { name: "Medium", price: 3 },
            { name: "Large", price: 6 },
          ],
        },
        {
          name: "SANDWICH",
          menu: ["VEG GRILLED", "CHEESE GRILLED", "CHICKEN GRILLED"],
          addons: ["Extra Cheese", "Extra Sauce"],
          variant: [
            { name: "Small", price: 0 },
            { name: "Large", price: 2 },
          ],
        },
      ],
    },
    {
      category: "SPECIALITY",
      sub: [
        {
          name: "PASTA",
          menu: ["CHICKEN ALFREDO", "MACARONI SALAD"],
          addons: ["Extra Cheese", "Extra Meat"],
          variant: [
            { name: "Regular", price: 0 },
            { name: "Large", price: 3 },
          ],
        },
      ],
    },
  ];

  const burgerMenus: string[] = [];
  let basicsCategoryId = "";
  let burgerSubCategoryId = "";
  let pizzaMenuIds: string[] = [];

  for (const block of foodTree) {
    const category = await prisma.category.create({
      data: {
        name: block.category,
        slug: slugify(block.category),
        isEnable: true,
        categoryTypeId: foodType.id,
      },
    });
    if (block.category === "THE BASICS") basicsCategoryId = category.id;

    for (const sub of block.sub) {
      const subCategory = await prisma.subCategory.create({
        data: {
          name: sub.name,
          isEnable: true,
          categoryId: category.id,
        },
      });
      if (sub.name === "BURGER") burgerSubCategoryId = subCategory.id;

      for (const menuName of sub.menu) {
        const base = randPrice(10, 22);
        const menu = await prisma.menu.create({
          data: {
            name: menuName,
            description: `House favourite ${menuName.toLowerCase()}`,
            fixedPrice: base,
            currentPrice: base,
            isEnable: true,
            subCategoryId: subCategory.id,
            tags: ["food"],
            variants: {
              create: sub.variant.map((v) => ({
                name: v.name,
                price: Number((base + v.price).toFixed(2)),
              })),
            },
            addons: {
              create: sub.addons.map((name) => ({
                name,
                price: Number((1 + Math.random() * 3).toFixed(2)),
              })),
            },
          },
        });
        if (sub.name === "BURGER") burgerMenus.push(menu.id);
        if (sub.name === "PIZZA") pizzaMenuIds.push(menu.id);
      }
    }
  }

  const liquorCat = await prisma.category.create({
    data: {
      name: "ON TAP",
      slug: "on-tap",
      isEnable: true,
      categoryTypeId: liquorType.id,
    },
  });

  const beerSub = await prisma.subCategory.create({
    data: {
      name: "BEER",
      isEnable: true,
      categoryId: liquorCat.id,
    },
  });

  const beers = ["Budweiser", "Steinlager", "Corona", "Heineken", "Asahi"];
  for (const name of beers) {
    const base = randPrice(6, 11);
    await prisma.menu.create({
      data: {
        name,
        description: `Ice-cold ${name}. Bid with the room — price moves with demand.`,
        fixedPrice: base,
        lowestPrice: base,
        highestPrice: Number((base + 5).toFixed(2)),
        currentPrice: base,
        step: 0.5,
        pricingEnabled: true,
        isEnable: true,
        subCategoryId: beerSub.id,
        tags: ["liquor", "beer"],
      },
    });
  }

  if (burgerMenus[0]) {
    const burger = await prisma.menu.findUnique({
      where: { id: burgerMenus[0] },
      include: { variants: true },
    });
    if (burger) {
      await prisma.combo.create({
        data: {
          name: "Burger + Fries Deal",
          description: "Any classic burger combo for less",
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

  // Home-page Belts — admin-configurable sections
  await prisma.belt.create({
    data: {
      name: "The Basics",
      sourceType: "CATEGORY",
      categoryId: basicsCategoryId,
      isSlider: false,
      isEnable: true,
      sortOrder: 0,
    },
  });

  await prisma.belt.create({
    data: {
      name: "Burgers",
      sourceType: "SUBCATEGORY",
      subCategoryId: burgerSubCategoryId,
      isSlider: true,
      isEnable: true,
      sortOrder: 1,
    },
  });

  await prisma.belt.create({
    data: {
      name: "Chef picks",
      sourceType: "MENUS",
      isSlider: false,
      isEnable: true,
      sortOrder: 2,
      items: {
        create: [...pizzaMenuIds.slice(0, 2), ...burgerMenus.slice(0, 2)].map(
          (menuId, index) => ({ menuId, sortOrder: index }),
        ),
      },
    },
  });

  await prisma.belt.create({
    data: {
      name: "On tap — live prices",
      sourceType: "CATEGORY",
      categoryId: liquorCat.id,
      isSlider: true,
      isEnable: true,
      sortOrder: 3,
    },
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
