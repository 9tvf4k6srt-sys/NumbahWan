import { copy } from "./copy";

export type Member = {
  slug: string;
  name: string;
  img: string;
  roleZh: string;
  roleEn: string;
};

const face = (slug: string) => `/brand/roster/${slug}.png?v=4`;

/** Live guild list — names + in-game portraits only. No CP, no Lv. */
export const roster: Member[] = [
  { slug: "reggina", name: "RegginA", img: face("reggina"), roleZh: "總書記", roleEn: "Master" },
  { slug: "gege", name: "帥葛葛", img: face("gege"), roleZh: "黨員", roleEn: "Member" },
  { slug: "tzxia2", name: "TZXIA2", img: face("tzxia2"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "bingfeng", name: "冰風雪月", img: face("bingfeng"), roleZh: "黨員", roleEn: "Member" },
  { slug: "reggino", name: "RegginO", img: face("reggino"), roleZh: "副書記", roleEn: "Vice" },
  { slug: "sun", name: "碼農小孫", img: face("sun"), roleZh: "黨員", roleEn: "Member" },
  { slug: "aguang", name: "阿光Yo", img: face("aguang"), roleZh: "黨員", roleEn: "Member" },
  { slug: "gawd", name: "Gawd", img: face("gawd"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "regginkrad", name: "Regginkrad", img: face("regginkrad"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "chengze", name: "怎麼鈕承澤樣", img: face("chengze"), roleZh: "黨員", roleEn: "Member" },
  { slug: "qniao", name: "騎鳥回家", img: face("qniao"), roleZh: "黨員", roleEn: "Member" },
  { slug: "neila", name: "內拉", img: face("neila"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "niojojer", name: "Niojojer", img: face("niojojer"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "belive", name: "Belive", img: face("belive"), roleZh: "中央政委", roleEn: "Commissar" },
  { slug: "yulunerqing", name: "Yuluner晴", img: face("yulunerqing"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "maniojoja", name: "MaNiojoja", img: face("maniojoja"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "queenk", name: "Queen恩K", img: face("queenk"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "tis36", name: "TW#TIS36VWLEA", img: face("tis36"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "leiyumo", name: "蕾與摩", img: face("leiyumo"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "heiqi", name: "陪玩黑騎", img: face("heiqi"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "shagua", name: "傻瓜小孩", img: face("shagua"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "guning", name: "估寧菇", img: face("guning"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "wantao", name: "紈蹈稅著", img: face("wantao"), roleZh: "預備黨員", roleEn: "Prospect" },
  { slug: "yuluner", name: "Yuluner", img: face("yuluner"), roleZh: "預備黨員", roleEn: "Prospect" },
];

export const EMPTY_SEATS = 6;

export const guild = {
  name: "NumbahWan",
  short: "N",
  level: 7,
  members: roster.length,
  capacity: 30,
  xp: 31950,
  xpMax: 198500,
  master: "RegginA",
  averageLevel: 84,
  joinMethodZh: copy.joinZh,
  joinMethodEn: copy.joinEn,
  conquestRank: 33,
  noticeZh: copy.noticeZh,
  noticeEn: copy.noticeEn,
  gameZh: copy.gameZh,
  gameEn: copy.gameEn,
  seatsLeft: EMPTY_SEATS,
  roster,
} as const;
