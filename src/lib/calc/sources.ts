/**
 * 計算に用いる出典の一覧。
 * 画面上の「計算根拠」表示とドキュメント(docs/CALCULATIONS.md)の両方から参照する。
 * 原典の記載内容は公開前に必ず原文で再確認すること。
 */
export const SOURCES = {
  jasso2022: {
    label: "日本肥満学会『肥満症診療ガイドライン2022』",
    note: "成人のBMI判定区分（18.5未満 低体重、25以上 肥満）",
  },
  ashwell2012: {
    label: "Ashwell M, Gunn P, Gibson S. Obes Rev. 2012;13(3):275-286",
    note: "ウエスト身長比 0.5 を健康リスクの目安とするメタアナリシス",
  },
  mifflin1990: {
    label: "Mifflin MD, St Jeor ST, et al. Am J Clin Nutr. 1990;51(2):241-247",
    note: "19〜78歳の成人を対象に作成された安静時代謝量の推定式",
  },
  koshimizu2005: {
    label: "小清水孝子ほか『スポーツ選手の推定エネルギー必要量』トレーニング科学 2005;17(4):245-250",
    note: "日本人アスリートの基礎代謝量を除脂肪量1kgあたり28.5kcalで推定（国立スポーツ科学センターの方法）",
  },
  fao2004: {
    label: "FAO/WHO/UNU. Human energy requirements. 2004",
    note: "身体活動レベル(PAL)の区分。本アプリの日常生活PALはこれを参考にしたアプリ設定値",
  },
  ainsworth2011: {
    label: "Ainsworth BE, et al. 2011 Compendium of Physical Activities. Med Sci Sports Exerc. 2011;43(8):1575-1581",
    note: "バレーボール・筋力トレーニングのMETs値",
  },
  thomas2016: {
    label: "Thomas DT, Erdman KA, Burke LM. ACSM/AND/DC Joint Position Statement: Nutrition and Athletic Performance. Med Sci Sports Exerc. 2016;48(3):543-568",
    note: "アスリートの炭水化物 3〜12 g/kg/日（運動量別）、タンパク質 1.2〜2.0 g/kg/日",
  },
  morton2018: {
    label: "Morton RW, et al. Br J Sports Med. 2018;52(6):376-384",
    note: "レジスタンストレーニング時の除脂肪量増加に対するタンパク質摂取 約1.6 g/kg/日",
  },
  dri2025: {
    label: "厚生労働省『日本人の食事摂取基準（2025年版）』",
    note: "脂質の目標量 エネルギー比20〜30%",
  },
  redS2023: {
    label: "Mountjoy M, et al. 2023 IOC consensus statement on REDs. Br J Sports Med. 2023;57(17):1073-1097",
    note: "相対的エネルギー不足(REDs)への注意喚起",
  },
  epley1985: {
    label: "Epley B. Poundage Chart. Boyd Epley Workout. 1985",
    note: "1RM推定式 重量×(1+回数/30)",
  },
  brzycki1993: {
    label: "Brzycki M. J Phys Educ Recreat Dance. 1993;64(1):88-90",
    note: "1RM推定式 重量×36/(37−回数)",
  },
  foster2001: {
    label: "Foster C, et al. J Strength Cond Res. 2001;15(1):109-115",
    note: "セッションRPE（主観的運動強度×時間）によるトレーニング負荷",
  },
  schoenfeld2017: {
    label: "Schoenfeld BJ, Ogborn D, Krieger JW. J Sports Sci. 2017;35(11):1073-1082",
    note: "筋肥大に対する週あたりセット数の用量反応（1部位 週10セット以上で効果が大きい傾向）",
  },
  acsm2009: {
    label: "ACSM Position Stand: Progression Models in Resistance Training for Healthy Adults. Med Sci Sports Exerc. 2009;41(3):687-708",
    note: "筋力向上を目的とした頻度・強度の目安",
  },
  watson2015: {
    label: "Watson NF, et al. Sleep. 2015;38(6):843-844（AASM/SRS 成人の推奨睡眠時間）",
    note: "成人は1晩7時間以上",
  },
  paruthi2016: {
    label: "Paruthi S, et al. J Clin Sleep Med. 2016;12(6):785-786（AASM 小児・青少年の推奨睡眠時間）",
    note: "13〜18歳は8〜10時間",
  },
} as const;

export type SourceId = keyof typeof SOURCES;
