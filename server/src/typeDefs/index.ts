export const typeDefs = `#graphql
  scalar DateTime

  type Site {
    id: ID!
    name: String!
    email: String
    logo: String
    banners: [String!]!
  }

  type Table {
    id: ID!
    name: String!
    isActive: Boolean!
  }

  type CategoryType {
    id: ID!
    name: String!
    categories: [Category!]!
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    image: String
    isEnable: Boolean!
    categoryType: CategoryType
    subCategories: [SubCategory!]!
  }

  type SubCategory {
    id: ID!
    name: String!
    image: String
    isEnable: Boolean!
    categoryId: ID!
    menus: [Menu!]!
  }

  type Menu {
    id: ID!
    name: String!
    description: String
    image: String
    fixedPrice: Float!
    lowestPrice: Float
    highestPrice: Float
    step: Float
    currentPrice: Float
    pricingEnabled: Boolean!
    isEnable: Boolean!
    tags: [String!]!
    subCategoryId: ID!
    addons: [MenuAddon!]!
    variants: [MenuVariant!]!
  }

  type MenuAddon {
    id: ID!
    name: String!
    price: Float!
  }

  type MenuVariant {
    id: ID!
    name: String!
    price: Float!
  }

  type Combo {
    id: ID!
    name: String!
    description: String
    image: String
    price: Float!
    isEnable: Boolean!
    items: [ComboItem!]!
  }

  type ComboItem {
    id: ID!
    quantity: Int!
    menu: Menu!
    menuVariant: MenuVariant
  }

  enum BeltSourceType {
    CATEGORY
    SUBCATEGORY
    MENUS
  }

  type BeltItem {
    id: ID!
    sortOrder: Int!
    menu: Menu!
  }

  type Belt {
    id: ID!
    name: String!
    sourceType: BeltSourceType!
    categoryId: ID
    category: Category
    subCategoryId: ID
    subCategory: SubCategory
    isSlider: Boolean!
    isEnable: Boolean!
    sortOrder: Int!
    items: [BeltItem!]!
    """Resolved menus for storefront rendering."""
    menus: [Menu!]!
  }

  enum PageBlockType {
    IMAGE
    RICH_TEXT
    BELT
    MENU_BROWSE
  }

  enum ImageLayout {
    SINGLE
    COLUMN
    SLIDER
  }

  type BannerButton {
    label: String!
    href: String!
    variant: String!
  }

  type PageBlock {
    id: ID!
    type: PageBlockType!
    sortOrder: Int!
    isEnable: Boolean!
    images: [String!]!
    imageLayout: ImageLayout
    isBanner: Boolean!
    buttons: [BannerButton!]!
    content: String
    beltId: ID
    belt: Belt
  }

  type Page {
    id: ID!
    title: String!
    slug: String!
    isEnable: Boolean!
    sortOrder: Int!
    blocks: [PageBlock!]!
  }

  type CartItemAddon {
    id: ID!
    menuAddon: MenuAddon!
  }

  type CartItem {
    id: ID!
    quantity: Int!
    salePrice: Float!
    menu: Menu
    menuVariant: MenuVariant
    combo: Combo
    addons: [CartItemAddon!]!
  }

  type Cart {
    id: ID!
    note: String
    tableId: ID
    table: Table
    items: [CartItem!]!
  }

  type OrderItem {
    id: ID!
    quantity: Int!
    salePrice: Float!
    menu: Menu
    menuVariant: MenuVariant
    combo: Combo
  }

  type Order {
    id: ID!
    orderNumber: String!
    status: String!
    totalAmount: Float!
    guestName: String
    guestEmail: String
    note: String
    table: Table
    items: [OrderItem!]!
    createdAt: DateTime!
  }

  type User {
    id: ID!
    clerkId: String!
    email: String
    name: String
    role: String!
  }

  type BidResult {
    success: Boolean!
    failCount: Int!
    # True after 3 failed bids — client shows live-price Accept offer instead of chat
    offerLivePrice: Boolean!
    message: String!
    currentPrice: Float!
    cartItem: CartItem
  }

  type CheckoutResult {
    url: String
    sessionId: String!
    orderId: ID!
  }

  type PriceState {
    menuId: ID!
    currentPrice: Float!
    lowestPrice: Float!
    highestPrice: Float!
    step: Float!
  }

  type Query {
    site: Site
    tables: [Table!]!
    table(id: ID!): Table
    categoryTypes: [CategoryType!]!
    categories(isEnable: Boolean): [Category!]!
    categoryBySlug(slug: String!): Category
    menu(id: ID!): Menu
    menus(pricingEnabled: Boolean): [Menu!]!
    combos(isEnable: Boolean): [Combo!]!
    belts(isEnable: Boolean): [Belt!]!
    pages(isEnable: Boolean): [Page!]!
    page(id: ID!): Page
    pageBySlug(slug: String!): Page
    getCart(id: ID!): Cart
    orders(limit: Int): [Order!]!
    order(id: ID!): Order
    me: User
  }

  input CartInput {
    tableId: ID
    guestId: String
    userId: ID
    note: String
  }

  input CartItemInput {
    cartId: ID!
    menuId: ID
    menuVariantId: ID
    comboId: ID
    quantity: Int!
    salePrice: Float!
    addonIds: [ID!]
  }

  input CategoryInput {
    name: String!
    slug: String
    image: String
    isEnable: Boolean
    categoryTypeId: ID!
  }

  input SubCategoryInput {
    name: String!
    image: String
    isEnable: Boolean
    categoryId: ID!
  }

  input MenuOptionInput {
    id: ID
    name: String!
    price: Float!
  }

  input MenuInput {
    name: String!
    description: String
    image: String
    fixedPrice: Float!
    lowestPrice: Float
    highestPrice: Float
    step: Float
    currentPrice: Float
    pricingEnabled: Boolean
    isEnable: Boolean
    tags: [String!]
    subCategoryId: ID!
    # Size / option variants (e.g. Small, Large)
    variants: [MenuOptionInput!]
    # Add-ons (e.g. Extra Cheese)
    addons: [MenuOptionInput!]
  }

  input TableInput {
    name: String!
    isActive: Boolean
  }

  input ComboInput {
    name: String!
    description: String
    image: String
    price: Float!
    isEnable: Boolean
    items: [ComboItemInput!]!
  }

  input ComboItemInput {
    menuId: ID!
    menuVariantId: ID
    quantity: Int
  }

  input SiteInput {
    name: String
    email: String
    logo: String
    banners: [String!]
  }

  input BeltItemInput {
    menuId: ID!
    sortOrder: Int
  }

  input BeltInput {
    name: String!
    sourceType: BeltSourceType!
    categoryId: ID
    subCategoryId: ID
    isSlider: Boolean
    isEnable: Boolean
    sortOrder: Int
    menuIds: [ID!]
  }

  input BannerButtonInput {
    label: String!
    href: String!
    variant: String
  }

  input PageBlockInput {
    id: ID
    type: PageBlockType!
    sortOrder: Int
    isEnable: Boolean
    images: [String!]
    imageLayout: ImageLayout
    isBanner: Boolean
    buttons: [BannerButtonInput!]
    content: String
    beltId: ID
  }

  input PageInput {
    title: String!
    slug: String
    isEnable: Boolean
    sortOrder: Int
    blocks: [PageBlockInput!]
  }

  type Mutation {
    createCart(input: CartInput!): Cart!
    updateCart(id: ID!, tableId: ID, note: String): Cart!
    addCartItem(input: CartItemInput!): CartItem!
    deleteCartItem(id: ID!): Boolean!
    placeBid(
      menuId: ID!
      amount: Float!
      cartId: ID!
      sessionId: String!
      # 1-based fail attempt in this modal (for chat tone); omit on success / accept-offer
      chatAttempt: Int
      # Last assistant line — model must not repeat it
      lastReply: String
    ): BidResult!
    createCheckoutSession(
      cartId: ID!
      tableId: ID
      guestName: String
      guestEmail: String
      successUrl: String!
      cancelUrl: String!
    ): CheckoutResult!
    upsertMe(clerkId: String!, email: String, name: String, role: String): User!
    storeTable(input: TableInput!): Table!
    updateTable(id: ID!, input: TableInput!): Table!
    deleteTable(id: ID!): Boolean!
    storeCategory(input: CategoryInput!): Category!
    updateCategory(id: ID!, input: CategoryInput!): Category!
    deleteCategory(id: ID!): Boolean!
    storeSubCategory(input: SubCategoryInput!): SubCategory!
    updateSubCategory(id: ID!, input: SubCategoryInput!): SubCategory!
    deleteSubCategory(id: ID!): Boolean!
    storeMenu(input: MenuInput!): Menu!
    updateMenu(id: ID!, input: MenuInput!): Menu!
    deleteMenu(id: ID!): Boolean!
    storeCombo(input: ComboInput!): Combo!
    updateCombo(id: ID!, input: ComboInput!): Combo!
    deleteCombo(id: ID!): Boolean!
    storeBelt(input: BeltInput!): Belt!
    updateBelt(id: ID!, input: BeltInput!): Belt!
    deleteBelt(id: ID!): Boolean!
    storePage(input: PageInput!): Page!
    updatePage(id: ID!, input: PageInput!): Page!
    deletePage(id: ID!): Boolean!
    adminForcePrice(menuId: ID!, action: String!): PriceState!
    updateSite(input: SiteInput!): Site!
    updateOrderStatus(id: ID!, status: String!): Order!
  }
`;
