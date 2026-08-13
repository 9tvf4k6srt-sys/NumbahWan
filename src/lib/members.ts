import { roster, type Member } from "./guild";

export type MemberCard = Member & {
  art: string;
  thumb: string;
  captionZh: string;
  captionEn: string;
  hook: string;
};

const ART_V = "3";
const art = (slug: string) => `/brand/portraits/${slug}.jpg?v=${ART_V}`;
const thumb = (slug: string) => `/brand/portraits/thumbs/${slug}.jpg?v=${ART_V}`;

const extra: Record<
  string,
  { captionZh: string; captionEn: string; hook: string }
> = {
  reggina: {
    captionZh: "八隻手，還是她說了算。",
    captionEn: "Eight arms. Still her call.",
    hook: "zakum-master",
  },
  gege: {
    captionZh: "帥是自稱的。葛是認真的。",
    captionEn: "Handsome is self-issued.",
    hook: "handsome-bro",
  },
  tzxia2: {
    captionZh: "名字像驗證碼。人是真的。",
    captionEn: "Name looks like a captcha.",
    hook: "rune-lock",
  },
  bingfeng: {
    captionZh: "四個字全是天氣。人很熱。",
    captionEn: "Four seasons. Still on fire.",
    hook: "ice-moon",
  },
  reggino: {
    captionZh: "副書記帶熊來開會。",
    captionEn: "Vice brought the bear.",
    hook: "bear-vice",
  },
  sun: {
    captionZh: "先存檔，再打炎魔。",
    captionEn: "Save first. Then Zakum.",
    hook: "coder-sun",
  },
  aguang: {
    captionZh: "藍毛線帽。紅聖誕裝。光是她自己。",
    captionEn: "Blue pom hat. Santa red. She's the light.",
    hook: "santa-beanie-light",
  },
  gawd: {
    captionZh: "少一個字母。氣勢沒少。",
    captionEn: "Spelling's off. Aura isn't.",
    hook: "crooked-halo",
  },
  regginkrad: {
    captionZh: "第三個 Reggin。一樣能打。",
    captionEn: "Third Reggin. Same punch.",
    hook: "third-reggin",
  },
  chengze: {
    captionZh: "導演沒來。分身先到。",
    captionEn: "Director's busy. Twin isn't.",
    hook: "maple-clapboard",
  },
  qniao: {
    captionZh: "地鐵沒了。鳥還在。",
    captionEn: "Train's gone. Bird isn't.",
    hook: "ride-bird-home",
  },
  neila: {
    captionZh: "兩個字。存在感十個字。",
    captionEn: "Two characters. Ten of presence.",
    hook: "pull-in",
  },
  niojojer: {
    captionZh: "唸得出來，就算自己人。",
    captionEn: "Say it once. You're in.",
    hook: "mohawk-shout",
  },
  belive: {
    captionZh: "少一個 e。信仰沒少。",
    captionEn: "Missing an e. Not the faith.",
    hook: "falling-e",
  },
  yulunerqing: {
    captionZh: "晴天是她帶進來的。",
    captionEn: "She walked the clear sky in.",
    hook: "clear-morning",
  },
  maniojoja: {
    captionZh: "雙馬尾比雙刀還危險。",
    captionEn: "Twin tails. Worse than blades.",
    hook: "twin-tails",
  },
  queenk: {
    captionZh: "女王先到。帽子隨便戴。",
    captionEn: "Queen first. Hat is extra.",
    hook: "casual-queen",
  },
  tis36: {
    captionZh: "這串是門票。人已經進場。",
    captionEn: "Looks like a ticket. Already in.",
    hook: "entry-ticket",
  },
  leiyumo: {
    captionZh: "蕾也來了。摩也來了。",
    captionEn: "Lei showed. Mo showed.",
    hook: "two-chicks",
  },
  heiqi: {
    captionZh: "黑騎陪打。心不賣。",
    captionEn: "Dark Knight for hire. Heart isn't.",
    hook: "hired-knight",
  },
  shagua: {
    captionZh: "傻瓜小孩。雪人還沒長大。",
    captionEn: "Silly kid. Snowman never grew up.",
    hook: "snowman-kid",
  },
  guning: {
    captionZh: "菇可以估。傷害不能估。",
    captionEn: "Appraise the mushroom. Not the damage.",
    hook: "mushroom-loupe",
  },
  wantao: {
    captionZh: "稅都著了。還在跳。",
    captionEn: "Taxes on. Still dancing.",
    hook: "tax-dance",
  },
  yuluner: {
    captionZh: "晴的夜班。",
    captionEn: "晴's night shift.",
    hook: "night-twin",
  },
};

export const memberCards: MemberCard[] = roster.map((m) => {
  const e = extra[m.slug];
  if (!e) {
    throw new Error(`missing member art copy for ${m.slug}`);
  }
  return { ...m, art: art(m.slug), thumb: thumb(m.slug), ...e };
});
