/* ============================================================
   RECLAIM accounts
   One account per person: full name + student ID must both match.
   Upper or lower case does not matter when logging in.
   ============================================================ */

// [full name, student ID]
const ROSTER = [
  ["Almer Taufiqurrahman Putra Dani", "25081011"],
  ["Bunayya Roudhoh Al Muharrom", "25081023"],
  ["Callista Aqila Najla Ghassania Prasetio", "25082024"],
  ["Callysta Jeconia Purba", "25082025"],
  ["Cresnaydin Eshanasfa Ranuwiehan", "25081028"],
  ["Davin Davano Nugraha", "25081029"],
  ["Diajeng Fahrunizza", "25082030"],
  ["Evan Naftali Pangkung", "25081035"],
  ["Fathan Adam Abdurrahman", "25081038"],
  ["Ghalin Andakara Priyono", "25081042"],
  ["Hanin Khairunnisa Fauzan", "25082048"],
  ["Hannandhya Qaisshidqi Linarchadi", "25081049"],
  ["Jordan Imanuel Samudra Ketaren", "25081061"],
  ["Kafa Bilislami Dina", "25082063"],
  ["Kenzie Bramantya Lazuardi", "25081067"],
  ["Michella Lecika Dumatubun", "25082081"],
  ["Muhammad Deceza Khoirul Anam", "25081084"],
  ["Muhammad Farrel Attallah", "25081086"],
  ["Muhammad Fauzan Ferdiansyah", "25081087"],
  ["Nadia Siti Ramadhani", "25082093"],
  ["Nicodemus Farrell Abiyasa", "25081100"],
  ["Ravi Barra Satria", "25081109"],
  ["Rheina Huga Adyvta Putri", "25082114"],
  ["Sorta Maharani Tambunan", "25082121"],
  ["Adya Wafirah", "25082001"],
  ["Ahmad Dzaky Ramdhani", "25081004"],
  ["Alexander Faathir", "25081008"],
  ["Aliya Zahra Tri Kusumawardhani", "25082009"],
  ["Altair Haruki Jazmi", "25081012"],
  ["Athalla Raditya", "25081015"],
  ["Elekta Fortuna Simanullang", "25082034"],
  ["Feliciano Satriyo Langit Antaseno", "25081039"],
  ["Gde Abhicanika Oka Pratidina", "25081041"],
  ["Grendi Maulana Wicaksono", "25081045"],
  ["Hanifah Selpa Fakhirah", "25082047"],
  ["Kenan Adi Nugraha", "25081065"],
  ["Ketut Andra Nugraha Utama", "25081068"],
  ["Laysa Shavila Anindya Armina", "25082071"],
  ["Lintang Pradipta Hadiwijoyo", "25081072"],
  ["Mahandika Abimanyu", "25081076"],
  ["Nayla Putri Az Zahra", "25082097"],
  ["Petra Budi Ainunnisa", "25082102"],
  ["Pratista Ardi Wikrama", "25081103"],
  ["Putu Gery Dharma Ramanda Prasetya", "25081104"],
  ["Quinsha Farras Fatima Nugroho", "25082106"],
  ["Shafira Aurelia", "25082117"],
  ["Yakob Fransiskus Hutapea", "25081133"],
  ["Ahmad Dzaky Ardhani", "25081003"],
  ["Almahyra Zayyan Vidias Aracelli", "25082010"],
  ["Arfa Raihan Putera Prasetyo", "25081014"],
  ["Athaya Fawnia", "25082016"],
  ["Atmimlana Nurona Wynstelle Geulis Fathin", "25082017"],
  ["Bimo Giri Prakoso", "25081022"],
  ["Carissa Nathania Purba", "25082026"],
  ["Farrel Arshavin Faiq", "25081037"],
  ["Ghiyats Ahmad Fawwaz", "25081044"],
  ["Haydar Arkana", "25081050"],
  ["I Gusti Ngurah Putu Khrisna Putra Santika", "25081052"],
  ["Jessica Clorinda Sihaloho", "25082057"],
  ["Jhason Myer Nathanael", "25081059"],
  ["Kevin Philbert Siregar", "25081069"],
  ["Nabil Lintang Favian", "25081091"],
  ["Naira Rifaya Nur", "25082095"],
  ["Naufal Vitrianda Ramadhan", "25081096"],
  ["Putu Trea Asha Asmara", "25082105"],
  ["Reynard Nehemia Sihotang", "25081113"],
  ["Shahnaz Salwa Ashadi", "25082118"],
  ["Tanaya Sabriya Andyta", "25082124"],
  ["Tisya Angelina Aritonang", "25082125"],
  ["Wayan Akasa Dharmawan", "25081131"],
  ["Akeela Querida Belani", "25082006"],
  ["Alzena Azalia Herman", "25082013"],
  ["Christo Putra Sibarani", "25081027"],
  ["Diandramadhani Gaia Iswandi", "25082031"],
  ["Edward Ammarullah Muhammad", "25081032"],
  ["Efrain Kevin Edward Zefa Adrian", "25081033"],
  ["Fadel Adi Rasya", "25081036"],
  ["Halilintar Raja Athari Nasution", "25081046"],
  ["Hilmy Azzamy Lubis", "25081051"],
  ["Ignatia Annabell Puspitaningtyas", "25082053"],
  ["Kalisha Resendria Camaidza", "25082064"],
  ["Kenneth Arkananta", "25081066"],
  ["M. Vicky Alghayts Desava", "25081075"],
  ["Michel Claudia Hikaru", "25082080"],
  ["Muhammad Fajar Bagus Prasojo", "25081085"],
  ["Myiesha Shafira", "25082090"],
  ["Nadya Khoirunnisa", "25082094"],
  ["Nicholas Boas Samuel Siagian", "25081098"],
  ["Nicholas Julius Nababan", "25081099"],
  ["Ravindra Khalid Diandro", "25081110"],
  ["Sharla Carissa Alfreyda", "25082119"],
  ["Sheikha Zahira Zuhra", "25082120"],
  ["Vashwan Gamaliel Hamonangan", "25081129"],
  ["Aisyah Bintani Syakira", "25082005"],
  ["Avicenna Miftahurrizqi Purnomo", "25081018"],
  ["Aziza Amru Nisa", "25082019"],
  ["Bhinneka Anargya Tunggal Ika", "25081021"],
  ["Ghazi Athallah Arief", "25081043"],
  ["Jalarkaa Abarrahesa", "25081055"],
  ["Jeremiah Prabu Prananta", "25081056"],
  ["Jessica Zivanna Novelina Sihombing", "25082058"],
  ["Joshua Julius Situmorang", "25081062"],
  ["Litany Dahliani Laryssa Damanik", "25082074"],
  ["Marissa Patricia Simbolon", "25082077"],
  ["Muhammad Ayyas Hamizan Nugroho", "25081083"],
  ["Muhammad Shaquille Khalid El Shirazy Gun", "25081089"],
  ["Nabil Rayhan Nuroktafi", "25081092"],
  ["Orozco Welfort Tomosegu", "25081101"],
  ["Rafat Ali Al'Aththar", "25081107"],
  ["Rasyid Shalahuddin Bagaskarim", "25081108"],
  ["Rayhan Abdurahman", "25081112"],
  ["Talitha Nesya Humaira", "25082123"],
  ["Valeria Chelsea De Santa Nugroho", "25082127"],
  ["Yohana Olivia Manurung", "25082134"],
  ["Yumna Azalia", "25082135"],
  ["Zayaan Prasasti Ramadhan", "25081137"],
  ["Agnes Paramitha Nugroho", "25082002"],
  ["Akhtarelgusya Al Dian", "25081007"],
  ["Benita Joanna Natama Limbong", "25082020"],
  ["Gaza Langgai Generasi Suardin", "25081040"],
  ["Indobona Firman", "25081054"],
  ["Jolie Theresia Marchena Silitonga", "25082060"],
  ["Laiqa Shin Shiya", "25082070"],
  ["Lionel Faeyza Pradana", "25081073"],
  ["Marsha Kirana Nareswari", "25082078"],
  ["Matthew Steffano Adley", "25081079"],
  ["Mikhail Fahim Dhiaulhaq", "25081082"],
  ["Muhammad Kenjiro Walipakcy Azhar", "25081088"],
  ["Rayga Dafi Kamagia Marpaung", "25081111"],
  ["Riskiya Ayeela Rahadian", "25082115"],
  ["Sahadin Nawaf Alfelarizi", "25081116"],
  ["Sultan Muhammad Anis Raisya", "25081122"],
  ["Tobias Edric Bonatua Wisantyo", "25081126"],
  ["Vanessa Narwastu Arisandhi Tarigan", "25082128"],
  ["Violan Griselda Anoveris", "25082130"],
  ["Wirasena Ganendra", "25081132"],
  ["Yuwawira Haidar", "25081136"],
  ["Zefanya Reyna Utomo", "25082138"],
  ["Zlatan Ezra Alhenya Gunawan", "25081139"]
];

// Admin accounts: add as many as you want, one line each.
// Admins can remove history, found items and wanted items, can hide people
// on the leaderboard, and never appear on the leaderboard themselves.
// Admin IDs can be anything (they skip the 2508xxxx rule).
const ADMIN_ACCOUNTS = [
  { name: "mogumogu", id: "1234567890" },
  { name: "admin", id: "12345" },
];

const ADMINS = ADMIN_ACCOUNTS.map(a => ({ ...a, admin: true }));
const ACCOUNTS = [
  ...ROSTER.map(([name, id]) => ({ name, id })),
  ...ADMINS,
];
function isAdminAccountId(id){
  const i = (id || "").toString().trim().toLowerCase();
  return ADMINS.some(a => a.id.toLowerCase() === i);
}


function normName(s){
  return (s || "").toString().replace(/[\u2018\u2019]/g, "'").trim().toLowerCase().replace(/\s+/g, " ");
}
function findAccount(name, id){
  const n = normName(name);
  const i = (id || "").toString().trim().toLowerCase();
  return ACCOUNTS.find(a => normName(a.name) === n && a.id.toLowerCase() === i) || null;
}
