/** Order shapes shared by the dashboard, the Orders page and the API client. */

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  imageUrl: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  itemCount: number;
  placedTime: string;
  placedDate: string;
  status: "Pending" | "Packed" | "Dispatched";
  thumbnailUrl: string;
  items: OrderItem[];
}

/** The demo products, used to build more demo orders without repeating the details. */
const DEMO_PRODUCTS = {
  sneakers: {
    id: "itm-1",
    name: "White Sneakers",
    imageUrl: "/item-sneaker.jpg",
  },
  tshirt: {
    id: "itm-2",
    name: "Black Classic T-Shirt",
    imageUrl: "/item-tshirt.jpg",
  },
  headphones: {
    id: "itm-3",
    name: "Wireless Headphones",
    imageUrl: "/item-headphones.jpg",
  },
  handbag: {
    id: "itm-4",
    name: "Leather Handbag",
    imageUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&auto=format&fit=crop&q=80",
  },
  watch: {
    id: "itm-5",
    name: "Fitness Smartwatch",
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
  },
  sunglasses: {
    id: "itm-6",
    name: "Polarized Sunglasses",
    imageUrl:
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&auto=format&fit=crop&q=80",
  },
};

function pendingDemoOrder(
  number: number,
  customerName: string,
  customerPhone: string,
  placedTime: string,
  lines: [keyof typeof DEMO_PRODUCTS, number][],
): OrderRecord {
  const items = lines.map(([key, quantity]) => ({
    ...DEMO_PRODUCTS[key],
    quantity,
  }));
  return {
    id: `ord-${number}`,
    orderNumber: `#${number}`,
    customerName,
    customerPhone,
    customerEmail: `${customerName.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
    placedTime,
    placedDate: "25 Nov 2026",
    status: "Pending",
    thumbnailUrl: items[0].imageUrl,
    items,
  };
}

/** More orders waiting to be packed, newest first. */
const MORE_PENDING_ORDERS: OrderRecord[] = [
  pendingDemoOrder(10606, "Meera Joseph", "+91 98470 66120", "8:35 PM", [
    ["sneakers", 1],
    ["tshirt", 1],
  ]),
  pendingDemoOrder(10605, "Arjun Pillai", "+91 94470 23019", "8:20 PM", [
    ["headphones", 1],
  ]),
  pendingDemoOrder(10604, "Nisha Menon", "+91 99610 45872", "8:05 PM", [
    ["handbag", 1],
    ["sunglasses", 1],
  ]),
  pendingDemoOrder(10603, "Sanjay Kurian", "+91 98950 71134", "7:50 PM", [
    ["watch", 2],
  ]),
  pendingDemoOrder(10602, "Fathima Beevi", "+91 97450 88213", "7:38 PM", [
    ["tshirt", 2],
    ["sneakers", 1],
  ]),
  pendingDemoOrder(10601, "Deepak Warrier", "+91 98460 30457", "7:25 PM", [
    ["sunglasses", 1],
  ]),
  pendingDemoOrder(10600, "Anjali Mohan", "+91 94460 91826", "7:12 PM", [
    ["handbag", 2],
    ["headphones", 1],
  ]),
  pendingDemoOrder(10599, "Jacob Mathew", "+91 98470 52361", "7:00 PM", [
    ["watch", 1],
    ["tshirt", 1],
  ]),
  pendingDemoOrder(10598, "Revathi Nambiar", "+91 99610 17748", "6:52 PM", [
    ["sneakers", 2],
  ]),
  pendingDemoOrder(10597, "Ashraf Ali", "+91 98950 64290", "6:44 PM", [
    ["headphones", 2],
    ["sunglasses", 1],
  ]),
  pendingDemoOrder(10596, "Thara Suresh", "+91 97450 39581", "6:35 PM", [
    ["handbag", 1],
  ]),
  pendingDemoOrder(10595, "Vineeth Raj", "+91 98460 76043", "6:22 PM", [
    ["tshirt", 3],
    ["watch", 1],
  ]),
  pendingDemoOrder(10594, "Aswin Raj", "+91 98470 44556", "6:10 PM", [
    ["watch", 2],
  ]),
  pendingDemoOrder(10593, "Lakshmi Nair", "+91 94460 66778", "5:55 PM", [
    ["handbag", 1],
    ["tshirt", 1],
  ]),
  pendingDemoOrder(10592, "Faisal Ahmed", "+91 98950 88990", "5:41 PM", [
    ["sneakers", 1],
  ]),
  pendingDemoOrder(10591, "Reshma Thomas", "+91 99610 12121", "5:30 PM", [
    ["sunglasses", 2],
    ["headphones", 1],
  ]),
  pendingDemoOrder(10590, "Gokul Krishnan", "+91 97450 34343", "5:12 PM", [
    ["tshirt", 3],
  ]),
  pendingDemoOrder(10589, "Anitha Varma", "+91 98460 56565", "4:58 PM", [
    ["watch", 1],
    ["sunglasses", 1],
  ]),
  pendingDemoOrder(10588, "Kavya Iyer", "+91 98470 11223", "4:52 PM", [
    ["sneakers", 2],
    ["tshirt", 1],
  ]),
  pendingDemoOrder(10587, "Rohit Das", "+91 98950 33445", "4:40 PM", [
    ["watch", 1],
  ]),
  pendingDemoOrder(10586, "Sneha Pillai", "+91 94470 55667", "4:15 PM", [
    ["handbag", 1],
    ["sunglasses", 1],
  ]),
  pendingDemoOrder(10585, "Imran Khan", "+91 99610 77889", "3:58 PM", [
    ["headphones", 2],
    ["tshirt", 2],
  ]),
  pendingDemoOrder(10584, "Divya Nair", "+91 98460 99001", "3:30 PM", [
    ["sunglasses", 1],
    ["watch", 1],
    ["tshirt", 1],
  ]),
  pendingDemoOrder(10583, "Vishnu Menon", "+91 97450 22334", "3:05 PM", [
    ["handbag", 2],
  ]),
];

/** Shown when the API or Shopify is not connected. */
export const DEMO_ORDERS: OrderRecord[] = [
  ...MORE_PENDING_ORDERS,
  {
    id: "ord-10582",
    orderNumber: "#10582",
    customerName: "Rahul Kumar",
    customerPhone: "+91 98765 43210",
    customerEmail: "rahul@example.com",
    itemCount: 3,
    placedTime: "2:34 PM",
    placedDate: "20 Nov 2026",
    status: "Pending",
    thumbnailUrl: "/item-sneaker.jpg",
    items: [
      {
        id: "itm-1",
        name: "White Sneakers",
        quantity: 1,
        imageUrl: "/item-sneaker.jpg",
      },
      {
        id: "itm-2",
        name: "Black Classic T-Shirt",
        quantity: 1,
        imageUrl: "/item-tshirt.jpg",
      },
      {
        id: "itm-3",
        name: "Wireless Over-Ear Headphones",
        quantity: 1,
        imageUrl: "/item-headphones.jpg",
      },
    ],
  },
  {
    id: "ord-10581",
    orderNumber: "#10581",
    customerName: "Anjali Menon",
    customerPhone: "+91 98451 23456",
    customerEmail: "anjali.m@example.com",
    itemCount: 2,
    placedTime: "2:33 PM",
    placedDate: "20 Nov 2026",
    status: "Pending",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-3",
        name: "Wireless Headphones",
        quantity: 1,
        imageUrl: "/item-headphones.jpg",
      },
      {
        id: "itm-5",
        name: "Fitness Smartwatch",
        quantity: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "ord-10580",
    orderNumber: "#10580",
    customerName: "Arjun Nair",
    customerPhone: "+91 97400 98765",
    customerEmail: "arjun.nair@example.com",
    itemCount: 5,
    placedTime: "2:31 PM",
    placedDate: "20 Nov 2026",
    status: "Pending",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-4",
        name: "Leather Handbag",
        quantity: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-6",
        name: "Polarized Sunglasses",
        quantity: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-2",
        name: "Black Classic T-Shirt",
        quantity: 2,
        imageUrl: "/item-tshirt.jpg",
      },
    ],
  },
  {
    id: "ord-10579",
    orderNumber: "#10579",
    customerName: "Meera S.",
    customerPhone: "+91 99123 45678",
    customerEmail: "meera.s@example.com",
    itemCount: 1,
    placedTime: "2:29 PM",
    placedDate: "20 Nov 2026",
    status: "Packed",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-5",
        name: "Fitness Smartwatch Black Edition",
        quantity: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "ord-10578",
    orderNumber: "#10578",
    customerName: "Vivek Das",
    customerPhone: "+91 98234 56789",
    customerEmail: "vivek.das@example.com",
    itemCount: 2,
    placedTime: "2:27 PM",
    placedDate: "20 Nov 2026",
    status: "Packed",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-6",
        name: "Polarized UV Sunglasses",
        quantity: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-1",
        name: "White Sneakers",
        quantity: 1,
        imageUrl: "/item-sneaker.jpg",
      },
    ],
  },
  {
    id: "ord-10577",
    orderNumber: "#10577",
    customerName: "Sneha Reddy",
    customerPhone: "+91 98490 12345",
    customerEmail: "sneha.reddy@example.com",
    itemCount: 4,
    placedTime: "2:25 PM",
    placedDate: "20 Nov 2026",
    status: "Dispatched",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-7",
        name: "Running Shoes Light Gold",
        quantity: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-4",
        name: "Leather Handbag",
        quantity: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-2",
        name: "Black Classic T-Shirt",
        quantity: 2,
        imageUrl: "/item-tshirt.jpg",
      },
    ],
  },
  {
    id: "ord-10576",
    orderNumber: "#10576",
    customerName: "Aditya Verma",
    customerPhone: "+91 98711 22334",
    customerEmail: "aditya.v@example.com",
    itemCount: 1,
    placedTime: "2:24 PM",
    placedDate: "20 Nov 2026",
    status: "Packed",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-1",
        name: "Sport Sneakers White/Grey",
        quantity: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80",
      },
    ],
  },
];

export const ORDER_STATUSES: OrderRecord["status"][] = [
  "Pending",
  "Packed",
  "Dispatched",
];
