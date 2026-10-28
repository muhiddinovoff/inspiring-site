import type { Dict } from "./uz"

const en: Dict = {
  code: "en",
  label: "English",
  short: "EN",
  decimal: ".",
  meta: {
    title: "Inspiring Education — Presidential School preparation",
    description:
      "Preparation for Presidential and specialized schools in Uzbekistan. 192+ students admitted in 2025–2026. 10 branches in Tashkent, Samarkand, Termez and Navoi.",
  },
  common: {
    apply: "Apply now",
    learnMore: "Learn more",
    close: "Close",
    call: "Call",
    language: "Language",
    skip: "Skip to content",
  },
  nav: {
    items: {
      natijalar: "Results",
      ustozlar: "Teachers",
      dasturlar: "Programs",
      yol: "How it works",
      savollar: "FAQ",
      filiallar: "Branches",
    },
    main: "Main menu",
    mobile: "Mobile menu",
    footer: "Footer menu",
    open: "Open menu",
    close: "Close menu",
    home: "Inspiring Education, home",
  },
  hero: {
    badge: "Enrollment open all year",
    titleBefore: "Your child’s path to a ",
    titleAccent: "Presidential School",
    titleAfter: " starts here",
    lead: (n: number) =>
      `Preparation for Presidential and specialized schools. In 2025–2026, more than ${n} of our students were admitted to the school of their dreams.`,
    cta: "Get a free consultation",
    boardKicker: "2025–2026 results",
    boardText: "students admitted to top schools",
    photoAlt: "Students in a classroom",
  },
  stats: {
    aria: "In numbers",
    items: [
      { suffix: "+", label: "students admitted in 2025–2026" },
      { suffix: "%", label: "of parents satisfied with lessons" },
      { suffix: "", label: "branches in four cities" },
      { suffix: "K", label: "parents follow our Telegram channel" },
    ],
  },
  results: {
    kicker: "Results",
    title: "Our results speak for themselves",
    text: "What our students have achieved over the years, and last school year’s results.",
    overall: {
      title: "Overall results",
      note: "Since the centre opened",
      items: [
        "to Presidential Schools",
        "to Al-Khwarizmi School",
        "to Mirzo Ulugbek School",
        "to specialized schools",
        "to foreign-language schools",
        "to academic lyceums",
        "national certificates in math",
        "to universities",
      ],
    },
    year: {
      title: "2025–2026 school year",
      text: "Where our students were admitted.",
    },
    total: (president: number) =>
      `students got into their dream school in one year, ${president} of them to Presidential Schools.`,
    items: [
      { label: "State specialized schools", short: "State spec." },
      { label: "Al-Khwarizmi International School", short: "Al-Khwarizmi" },
      { label: "Foreign-language specialized schools", short: "Language" },
      { label: "Other leading institutions", short: "Other" },
      { label: "Presidential Schools", short: "Presidential" },
    ],
  },
  reasons: {
    kicker: "Why Inspiring",
    title: "Why parents choose us",
    photoAlt: "A student writing in a notebook",
    badge: "of parents are happy with lesson quality and recommend us to others",
    items: [
      {
        title: "Teachers who know the exam",
        text: "Our teachers have spent years preparing students specifically for Presidential and specialized school exams.",
      },
      {
        title: "Real exam format",
        text: "Lessons and mock exams follow the real test’s requirements, timing and question types.",
      },
      {
        title: "You see the progress",
        text: "After every mock exam you know which topics your child has mastered and what still needs work.",
      },
      {
        title: "Close to home",
        text: "7 branches in Tashkent, plus Samarkand, Termez and Navoi. No time lost on long commutes.",
      },
    ],
  },
  teachers: {
    kicker: "Teachers",
    title: "Who will teach your child",
    text: "Teachers who know the exam requirements inside out and have guided students into top schools for years.",
    fallbackName: "Inspiring teacher",
    fallbackSubject: "Exam preparation",
    fallbackAbout:
      "A full profile of this teacher is coming soon. Our manager can tell you about schedules and groups.",
    exp: (e: string) => `${e} experience`,
    enroll: "Enroll",
    prev: "Previous teacher",
    next: "Next teacher",
  },
  programs: {
    kicker: "Programs",
    title: "A track for your child’s grade",
    text: "Price and schedule depend on grade and branch. Our manager will give you the details.",
    featured: "Main track",
    items: [
      {
        grade: "Grades 1–2",
        title: "Early start",
        text: "Logic and reading skills through play, without pressure. A solid foundation for the next stage.",
        points: ["Logical thinking", "Reading comprehension", "Small groups"],
      },
      {
        grade: "Grades 3–4",
        title: "Presidential School preparation",
        text: "Our main track. Structured preparation for every section of the exam.",
        points: ["Math and logic", "Native language and English", "Regular mock exams"],
      },
      {
        grade: "Grades 2–4",
        title: "Specialized schools",
        text: "Exam and interview preparation for Al-Khwarizmi, state and foreign-language specialized schools.",
        points: ["Al-Khwarizmi School", "Language schools", "Interview preparation"],
      },
    ],
  },
  steps: {
    kicker: "How it works",
    title: "From application to admission",
    text: "You take the first step. From then on, a manager and teachers are with you all the way.",
    items: [
      { title: "You apply", text: "It takes a minute: just a name and a phone number." },
      {
        title: "A manager calls you",
        text: "They ask about your child, their grade and your goals, and answer your questions.",
      },
      { title: "We assess the level", text: "We find out where your child is now and pick the right group and plan." },
      { title: "Structured lessons", text: "Classes on every exam topic plus regular mock exams." },
      { title: "Admission", text: "Document submission and final preparation for exam day." },
    ],
  },
  faq: {
    kicker: "FAQ",
    title: "What parents often ask",
    text: "Can’t find an answer? Give us a call and our manager will explain everything.",
    items: [
      {
        q: "My child is in grade 2. Isn’t it too early?",
        a: "No. Starting early takes the pressure off: your child learns the material without rushing. Our manager will suggest the right track for their age.",
      },
      {
        q: "How much does it cost and what is the schedule?",
        a: "Price and schedule depend on grade, track and branch. Leave a request and our manager will give you exact details.",
      },
      {
        q: "Which schools do you prepare for?",
        a: "Presidential Schools, Al-Khwarizmi International School, state and foreign-language specialized schools, and other leading institutions.",
      },
      {
        q: "When does enrollment start?",
        a: "Enrollment is open all year. You can apply and start preparing at any time.",
      },
      {
        q: "Where are classes held?",
        a: "In 7 districts of Tashkent and at our branches in Samarkand, Termez and Navoi. See the addresses in the Branches section below.",
      },
    ],
  },
  branches: {
    kicker: "Branches",
    title: "Pick a branch near you",
    text: "10 branches: 7 in Tashkent and one each in Samarkand, Termez and Navoi. Tap an address to open the map.",
    filter: "City",
    all: "All",
    landmark: "Landmark",
    cities: { tashkent: "Tashkent", samarkand: "Samarkand", termez: "Termez", navoi: "Navoi" },
    items: [
      { name: "Chilanzar", address: "Novza metro station, Sport Tovar crossroads, 4th floor" },
      {
        name: "Sergeli",
        address: "Sergeli district, by the 3rd stop",
        landmark: "above Asal Med clinic, near Sakhiy bazaar",
      },
      { name: "Yunusabad", address: "Yunusabad district", landmark: "next to Turkiston metro" },
      { name: "Yangidarkhon", address: "Yangihayot district, Yangidarkhon mahalla", landmark: "Sergeli 2" },
      { name: "Yashnabad", address: "85 Makhtumkuli street", landmark: "opposite Makro supermarket" },
      {
        name: "Olmos",
        address: "Yashnabad district, Military town, 58a, bldg 8",
        landmark: "10 min from Olmos metro, opposite Aziz Shifo Med",
      },
      { name: "TTZ", address: "Mirzo Ulugbek district, TTZ", landmark: "Diadora crossroads, next to Lokomotiv stop" },
      {
        name: "Future Leaders’ Academy",
        address: "Samarkand, 29 Bustonsaroy street",
        landmark: "Republican hospital, New bridge towards Dagbit",
      },
      { name: "Termez", address: "Termez city", landmark: "Soat crossroads" },
      {
        name: "Navoi",
        address: "50/1 Talabalar street",
        landmark: "opposite Azamat Fayz wedding hall, 14th microdistrict",
      },
    ],
    school: {
      kicker: "Private school",
      name: "Inspiring International School",
      address: "Chilanzar district, 1-Katta Chilanzar, bldg 6",
      landmark: "near the Tashkent City Prosecutor’s Office",
    },
  },
  lead: {
    kicker: "Enrollment open all year",
    title: "Take the first step today",
    text: "Leave your name and number. Our manager will call you back with the right track, price and schedule for your child.",
    perks: ["Takes one minute", "No obligation", "Your number is only used to contact you"],
    formTitle: "Book a free consultation",
    name: "Your name",
    namePlaceholder: "e.g. Dilnoza",
    nameError: "Please enter your name",
    phone: "Phone number",
    phoneError: "Enter the full number, e.g. 90 123 45 67",
    grade: "Child’s grade",
    optional: "(optional)",
    grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4"],
    submit: "Apply now",
    sending: "Sending",
    thanks: (name: string) => `Thank you, ${name}!`,
    sent: (phone: string) => `Your request has been received. Our manager will call you soon from ${phone}.`,
    manual: "To finish, send your request to us on Telegram or give us a call.",
    sendTelegram: "Send on Telegram",
    copy: "Copy",
    copied: "Copied",
    orCall: (phone: string) => `or call ${phone}`,
    leadText: (name: string, phone: string, grade?: string) =>
      `Request: ${name}, phone: ${phone}${grade ? `, ${grade}` : ""}`,
  },
  footer: {
    about:
      "Preparation centre for Presidential and specialized schools. 10 branches in Tashkent, Samarkand, Termez and Navoi.",
    subscribers: "13.6K",
  },
}

export default en
