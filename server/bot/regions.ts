/**
 * O‘zbekiston viloyatlari va ularning shahar/tumanlari (bot tugmalari uchun). Ro‘yxatda yo‘q joyni foydalanuvchi
 * qo‘lda yozishi mumkin, shuning uchun bu yerda kichik farq bo‘lsa ham ro‘yxatdan o‘tish to‘xtab qolmaydi.
 * Tartib muhim emas, lekin tugmalar shu tartibda chiqadi: avval shaharlar, keyin tumanlar.
 */
export type Region = { name: string; places: string[] }

const t = (names: string) => names.split(", ").map((n) => `${n} tumani`)
const c = (names: string) => names.split(", ").map((n) => `${n} shahri`)

export const REGIONS: Region[] = [
  {
    name: "Toshkent shahri",
    places: t(
      "Bektemir, Chilonzor, Mirobod, Mirzo Ulug‘bek, Olmazor, Sergeli, Shayxontohur, Uchtepa, Yakkasaroy, Yangihayot, Yashnobod, Yunusobod",
    ),
  },
  {
    name: "Toshkent viloyati",
    places: [
      ...c("Nurafshon, Angren, Bekobod, Chirchiq, Olmaliq, Ohangaron, Yangiyo‘l"),
      ...t(
        "Bekobod, Bo‘ka, Bo‘stonliq, Chinoz, Oqqo‘rg‘on, Ohangaron, Parkent, Piskent, Qibray, Quyichirchiq, Toshkent, O‘rtachirchiq, Yangiyo‘l, Yuqorichirchiq, Zangiota",
      ),
    ],
  },
  {
    name: "Andijon viloyati",
    places: [
      ...c("Andijon, Xonobod"),
      ...t(
        "Andijon, Asaka, Baliqchi, Bo‘ston, Buloqboshi, Izboskan, Jalaquduq, Marhamat, Oltinko‘l, Paxtaobod, Qo‘rg‘ontepa, Shahrixon, Ulug‘nor, Xo‘jaobod",
      ),
    ],
  },
  {
    name: "Farg‘ona viloyati",
    places: [
      ...c("Farg‘ona, Marg‘ilon, Qo‘qon, Quvasoy"),
      ...t(
        "Beshariq, Bog‘dod, Buvayda, Dang‘ara, Farg‘ona, Furqat, Oltiariq, Qo‘shtepa, Quva, Rishton, So‘x, Toshloq, Uchko‘prik, O‘zbekiston, Yozyovon",
      ),
    ],
  },
  {
    name: "Namangan viloyati",
    places: [
      ...c("Namangan"),
      ...t(
        "Chortoq, Chust, Davlatobod, Kosonsoy, Mingbuloq, Namangan, Norin, Pop, To‘raqo‘rg‘on, Uchqo‘rg‘on, Uychi, Yangiqo‘rg‘on, Yangi Namangan",
      ),
    ],
  },
  {
    name: "Samarqand viloyati",
    places: [
      ...c("Samarqand, Kattaqo‘rg‘on"),
      ...t(
        "Bulung‘ur, Ishtixon, Jomboy, Kattaqo‘rg‘on, Narpay, Nurobod, Oqdaryo, Pastdarg‘om, Paxtachi, Payariq, Qo‘shrabot, Samarqand, Toyloq, Urgut",
      ),
    ],
  },
  {
    name: "Buxoro viloyati",
    places: [
      ...c("Buxoro, Kogon"),
      ...t("Buxoro, G‘ijduvon, Jondor, Kogon, Olot, Peshku, Qorako‘l, Qorovulbozor, Romitan, Shofirkon, Vobkent"),
    ],
  },
  {
    name: "Navoiy viloyati",
    places: [
      ...c("Navoiy, Zarafshon, G‘ozg‘on"),
      ...t("Karmana, Konimex, Navbahor, Nurota, Qiziltepa, Tomdi, Uchquduq, Xatirchi"),
    ],
  },
  {
    name: "Qashqadaryo viloyati",
    places: [
      ...c("Qarshi, Shahrisabz"),
      ...t(
        "Chiroqchi, Dehqonobod, G‘uzor, Kasbi, Kitob, Koson, Ko‘kdala, Mirishkor, Muborak, Nishon, Qamashi, Qarshi, Shahrisabz, Yakkabog‘",
      ),
    ],
  },
  {
    name: "Surxondaryo viloyati",
    places: [
      ...c("Termiz"),
      ...t(
        "Angor, Bandixon, Boysun, Denov, Jarqo‘rg‘on, Muzrabot, Oltinsoy, Qiziriq, Qumqo‘rg‘on, Sariosiyo, Sherobod, Sho‘rchi, Termiz, Uzun",
      ),
    ],
  },
  {
    name: "Sirdaryo viloyati",
    places: [
      ...c("Guliston, Shirin, Yangiyer"),
      ...t("Boyovut, Guliston, Mirzaobod, Oqoltin, Sardoba, Sayxunobod, Sirdaryo, Xovos"),
    ],
  },
  {
    name: "Jizzax viloyati",
    places: [
      ...c("Jizzax"),
      ...t(
        "Arnasoy, Baxmal, Do‘stlik, Forish, G‘allaorol, Mirzacho‘l, Paxtakor, Sharof Rashidov, Yangiobod, Zafarobod, Zarbdor, Zomin",
      ),
    ],
  },
  {
    name: "Xorazm viloyati",
    places: [
      ...c("Urganch, Xiva"),
      ...t("Bog‘ot, Gurlan, Hazorasp, Qo‘shko‘pir, Shovot, Tuproqqal’a, Urganch, Xiva, Xonqa, Yangiariq, Yangibozor"),
    ],
  },
  {
    name: "Qoraqalpog‘iston Respublikasi",
    places: [
      ...c("Nukus"),
      ...t(
        "Amudaryo, Beruniy, Bo‘zatov, Chimboy, Ellikqal’a, Kegeyli, Mo‘ynoq, Nukus, Qanliko‘l, Qo‘ng‘irot, Qorao‘zak, Shumanay, Taxiatosh, Taxtako‘pir, To‘rtko‘l, Xo‘jayli",
      ),
    ],
  },
]
