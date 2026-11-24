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

/** Shown when the API or Shopify is not connected. */
export const DEMO_ORDERS: OrderRecord[] = [
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
    thumbnailUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80",
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
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-4",
        name: "Leather Handbag",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-6",
        name: "Polarized Sunglasses",
        quantity: 2,
        imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&auto=format&fit=crop&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-5",
        name: "Fitness Smartwatch Black Edition",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-6",
        name: "Polarized UV Sunglasses",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&auto=format&fit=crop&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-7",
        name: "Running Shoes Light Gold",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-4",
        name: "Leather Handbag",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&auto=format&fit=crop&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-1",
        name: "Sport Sneakers White/Grey",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80",
      },
    ],
  },
];

export const ORDER_STATUSES: OrderRecord["status"][] = ["Pending", "Packed", "Dispatched"];
