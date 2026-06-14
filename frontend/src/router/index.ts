import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { useUserStore } from "@/stores/user";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
    meta: { title: "登录", requiresAuth: false },
  },
  {
    path: "/",
    component: () => import("@/layouts/MainLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        redirect: "/dashboard",
      },
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/Dashboard.vue"),
        meta: { title: "仪表盘", icon: "DashboardOutlined" },
      },
      {
        path: "elderly",
        name: "Elderly",
        component: () => import("@/views/Elderly.vue"),
        meta: {
          title: "老人管理",
          icon: "UserOutlined",
          roles: ["admin", "worker"],
        },
      },
      {
        path: "orders",
        name: "Orders",
        component: () => import("@/views/Orders.vue"),
        meta: { title: "订单管理", icon: "ShoppingCartOutlined" },
      },
      {
        path: "canteens",
        name: "Canteens",
        component: () => import("@/views/Canteens.vue"),
        meta: { title: "助餐点管理", icon: "ShopOutlined", roles: ["admin"] },
      },
      {
        path: "subsidy",
        name: "Subsidy",
        component: () => import("@/views/Subsidy.vue"),
        meta: {
          title: "补贴报表",
          icon: "FileTextOutlined",
          roles: ["admin", "worker"],
        },
      },
      {
        path: "accounts",
        name: "MealAccounts",
        component: () => import("@/views/MealAccounts.vue"),
        meta: {
          title: "账户总览",
          icon: "WalletOutlined",
          roles: ["admin", "worker", "canteen"],
        },
      },
      {
        path: "accounts/:id",
        name: "AccountDetail",
        component: () => import("@/views/AccountDetail.vue"),
        meta: {
          title: "账户详情",
          hidden: true,
          roles: ["admin", "worker", "canteen"],
        },
      },
      {
        path: "recharge",
        name: "Recharge",
        component: () => import("@/views/Recharge.vue"),
        meta: {
          title: "充值管理",
          icon: "CreditCardOutlined",
          roles: ["admin", "worker"],
        },
      },
      {
        path: "transactions",
        name: "TransactionRecords",
        component: () => import("@/views/TransactionRecords.vue"),
        meta: {
          title: "流水查询",
          icon: "HistoryOutlined",
          roles: ["admin", "worker", "canteen"],
        },
      },
      {
        path: "account-stats",
        name: "AccountStatistics",
        component: () => import("@/views/AccountStatistics.vue"),
        meta: {
          title: "账户统计",
          icon: "BarChartOutlined",
          roles: ["admin", "worker", "canteen"],
        },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  userStore.initFromStorage();

  if (!userStore.isLoggedIn && to.meta.requiresAuth !== false) {
    next({ path: "/login", query: { redirect: to.fullPath } });
    return;
  }

  if (to.meta.roles && userStore.userInfo?.role) {
    const roles = to.meta.roles as string[];
    if (!roles.includes(userStore.userInfo.role)) {
      next("/dashboard");
      return;
    }
  }

  if (to.path === "/login" && userStore.isLoggedIn) {
    next("/dashboard");
    return;
  }

  next();
});

export default router;
