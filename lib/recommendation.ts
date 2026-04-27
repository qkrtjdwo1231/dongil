import type { CustomerRecommendations, OrderRecord } from "@/lib/types";

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildCustomerRecommendations(
  customer: string,
  orders: OrderRecord[]
): CustomerRecommendations {
  const relatedOrders = orders.filter((order) => order.customer === customer).slice(0, 5);

  const recentSites = uniqueSorted(
    relatedOrders.map((order) => order.site).filter((site): site is string => Boolean(site))
  );

  const frequentLines = uniqueSorted(
    relatedOrders.map((order) => order.line).filter((line): line is string => Boolean(line))
  );

  const seen = new Set<string>();
  const frequentItems = relatedOrders
    .map((order) => ({
      itemName: order.item_name,
      width: order.width,
      height: order.height
    }))
    .filter((item) => {
      const key = `${item.itemName}-${item.width}-${item.height}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  return {
    recentSites,
    frequentLines,
    frequentItems
  };
}
