export interface ReusableTab {
  url: string;
  blank: boolean;
}

export const pickReusableTab = <T extends ReusableTab>(tabs: T[], url: string): T | null =>
  tabs.find((tab) => tab.url === url) ?? tabs.find((tab) => tab.blank) ?? null;
