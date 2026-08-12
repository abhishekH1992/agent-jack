export const SITE_QUERY = `
  query Site {
    site { id name email logo banners }
  }
`;

export const CATEGORIES_QUERY = `
  query Categories {
    categories(isEnable: true) {
      id name slug image
      categoryType { id name }
      subCategories {
        id name
        menus {
          id name description image fixedPrice currentPrice lowestPrice highestPrice step pricingEnabled tags
          variants { id name price }
          addons { id name price }
        }
      }
    }
  }
`;

export const CATEGORY_BY_SLUG = `
  query CategoryBySlug($slug: String!) {
    categoryBySlug(slug: $slug) {
      id name slug
      categoryType { id name }
      subCategories {
        id name
        menus {
          id name description image fixedPrice currentPrice lowestPrice highestPrice step pricingEnabled tags
          variants { id name price }
          addons { id name price }
        }
      }
    }
  }
`;

export const TABLES_QUERY = `
  query Tables {
    tables { id name isActive }
  }
`;

export const COMBOS_QUERY = `
  query Combos {
    combos(isEnable: true) {
      id name description image price
      items { id quantity menu { id name } menuVariant { id name } }
    }
  }
`;

export const BELTS_QUERY = `
  query Belts($isEnable: Boolean) {
    belts(isEnable: $isEnable) {
      id name sourceType categoryId subCategoryId isSlider isEnable sortOrder
      category { id name slug }
      subCategory { id name }
      items { id sortOrder menu { id name } }
      menus {
        id name description image fixedPrice currentPrice lowestPrice highestPrice step pricingEnabled tags
        variants { id name price }
        addons { id name price }
      }
    }
  }
`;

export const STORE_BELT = `
  mutation StoreBelt($input: BeltInput!) {
    storeBelt(input: $input) {
      id name sourceType categoryId subCategoryId isSlider isEnable sortOrder
    }
  }
`;

export const UPDATE_BELT = `
  mutation UpdateBelt($id: ID!, $input: BeltInput!) {
    updateBelt(id: $id, input: $input) {
      id name sourceType categoryId subCategoryId isSlider isEnable sortOrder
    }
  }
`;

export const DELETE_BELT = `
  mutation DeleteBelt($id: ID!) {
    deleteBelt(id: $id)
  }
`;

const PAGE_FIELDS = `
  id title slug isEnable sortOrder
  blocks {
    id type sortOrder isEnable images imageLayout isBanner content beltId
    belt {
      id name sourceType categoryId subCategoryId isSlider isEnable sortOrder
      category { id name slug }
      subCategory { id name }
      items { id sortOrder menu { id name } }
      menus {
        id name description image fixedPrice currentPrice lowestPrice highestPrice step pricingEnabled tags
        variants { id name price }
        addons { id name price }
      }
    }
  }
`;

export const PAGES_QUERY = `
  query Pages($isEnable: Boolean) {
    pages(isEnable: $isEnable) { ${PAGE_FIELDS} }
  }
`;

export const PAGE_BY_SLUG = `
  query PageBySlug($slug: String!) {
    pageBySlug(slug: $slug) { ${PAGE_FIELDS} }
  }
`;

export const STORE_PAGE = `
  mutation StorePage($input: PageInput!) {
    storePage(input: $input) { ${PAGE_FIELDS} }
  }
`;

export const UPDATE_PAGE = `
  mutation UpdatePage($id: ID!, $input: PageInput!) {
    updatePage(id: $id, input: $input) { ${PAGE_FIELDS} }
  }
`;

export const DELETE_PAGE = `
  mutation DeletePage($id: ID!) {
    deletePage(id: $id)
  }
`;

export const ADMIN_CATALOG_QUERY = `
  query AdminCatalog {
    categoryTypes { id name }
    categories {
      id name slug image isEnable
      categoryType { id name }
      subCategories {
        id name image isEnable categoryId
        menus {
          id name description image fixedPrice currentPrice lowestPrice highestPrice
          step pricingEnabled isEnable tags subCategoryId
        }
      }
    }
  }
`;

export const STORE_CATEGORY = `
  mutation StoreCategory($input: CategoryInput!) {
    storeCategory(input: $input) {
      id name slug image isEnable
      categoryType { id name }
    }
  }
`;

export const UPDATE_CATEGORY = `
  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id name slug image isEnable
      categoryType { id name }
    }
  }
`;

export const DELETE_CATEGORY = `
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`;

export const STORE_SUBCATEGORY = `
  mutation StoreSubCategory($input: SubCategoryInput!) {
    storeSubCategory(input: $input) { id name image isEnable }
  }
`;

export const UPDATE_SUBCATEGORY = `
  mutation UpdateSubCategory($id: ID!, $input: SubCategoryInput!) {
    updateSubCategory(id: $id, input: $input) { id name image isEnable }
  }
`;

export const DELETE_SUBCATEGORY = `
  mutation DeleteSubCategory($id: ID!) {
    deleteSubCategory(id: $id)
  }
`;

export const STORE_MENU = `
  mutation StoreMenu($input: MenuInput!) {
    storeMenu(input: $input) {
      id name description image fixedPrice currentPrice lowestPrice highestPrice
      step pricingEnabled isEnable tags
    }
  }
`;

export const UPDATE_MENU = `
  mutation UpdateMenu($id: ID!, $input: MenuInput!) {
    updateMenu(id: $id, input: $input) {
      id name description image fixedPrice currentPrice lowestPrice highestPrice
      step pricingEnabled isEnable tags
    }
  }
`;

export const DELETE_MENU = `
  mutation DeleteMenu($id: ID!) {
    deleteMenu(id: $id)
  }
`;

export const GET_CART = `
  query GetCart($id: ID!) {
    getCart(id: $id) {
      id note tableId
      table { id name }
      items {
        id quantity salePrice
        menu { id name pricingEnabled }
        menuVariant { id name }
        combo { id name }
        addons { id menuAddon { id name price } }
      }
    }
  }
`;

export const CREATE_CART = `
  mutation CreateCart($input: CartInput!) {
    createCart(input: $input) { id tableId }
  }
`;

export const UPDATE_CART = `
  mutation UpdateCart($id: ID!, $tableId: ID, $note: String) {
    updateCart(id: $id, tableId: $tableId, note: $note) { id tableId note }
  }
`;

export const ADD_CART_ITEM = `
  mutation AddCartItem($input: CartItemInput!) {
    addCartItem(input: $input) { id quantity salePrice }
  }
`;

export const DELETE_CART_ITEM = `
  mutation DeleteCartItem($id: ID!) {
    deleteCartItem(id: $id)
  }
`;

export const PLACE_BID = `
  mutation PlaceBid($menuId: ID!, $amount: Float!, $cartId: ID!, $sessionId: String!) {
    placeBid(menuId: $menuId, amount: $amount, cartId: $cartId, sessionId: $sessionId) {
      success failCount message currentPrice
      cartItem { id }
    }
  }
`;

export const CHECKOUT = `
  mutation Checkout(
    $cartId: ID!
    $tableId: ID
    $guestName: String
    $guestEmail: String
    $successUrl: String!
    $cancelUrl: String!
  ) {
    createCheckoutSession(
      cartId: $cartId
      tableId: $tableId
      guestName: $guestName
      guestEmail: $guestEmail
      successUrl: $successUrl
      cancelUrl: $cancelUrl
    ) { url sessionId orderId }
  }
`;

export const LIQUOR_MENUS = `
  query LiquorMenus {
    menus(pricingEnabled: true) {
      id name currentPrice lowestPrice highestPrice step pricingEnabled fixedPrice
    }
  }
`;

export const ORDERS_QUERY = `
  query Orders {
    orders(limit: 40) {
      id orderNumber status totalAmount guestName createdAt
      table { id name }
      items { id quantity salePrice menu { id name } }
    }
  }
`;

export const DASHBOARD_ORDERS_QUERY = `
  query DashboardOrders {
    orders(limit: 200) {
      id orderNumber status totalAmount guestName createdAt
      table { id name }
      items {
        id quantity salePrice
        menu { id name pricingEnabled }
      }
    }
  }
`;

export const ADMIN_FORCE = `
  mutation AdminForce($menuId: ID!, $action: String!) {
    adminForcePrice(menuId: $menuId, action: $action) {
      menuId currentPrice lowestPrice highestPrice step
    }
  }
`;

export const STORE_TABLE = `
  mutation StoreTable($input: TableInput!) {
    storeTable(input: $input) { id name isActive }
  }
`;

export const DELETE_TABLE = `
  mutation DeleteTable($id: ID!) {
    deleteTable(id: $id)
  }
`;

export const UPDATE_ORDER_STATUS = `
  mutation UpdateOrderStatus($id: ID!, $status: String!) {
    updateOrderStatus(id: $id, status: $status) { id status }
  }
`;

export const UPDATE_SITE = `
  mutation UpdateSite($input: SiteInput!) {
    updateSite(input: $input) { id name email logo banners }
  }
`;

export const UPSERT_ME = `
  mutation UpsertMe($clerkId: String!, $email: String, $name: String) {
    upsertMe(clerkId: $clerkId, email: $email, name: $name) {
      id clerkId email name role
    }
  }
`;
