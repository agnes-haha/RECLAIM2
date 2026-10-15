/* ============================================================
   RECLAIM settings
   Things you may want to edit later live here.
   ============================================================ */

// Supabase project (Project Settings -> API)
const SUPABASE_URL = "https://gexqgceskhhpwzljlooj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdleHFnY2Vza2hocHd6bGpsb29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NDE0NjgsImV4cCI6MjEwNzUxNzQ2OH0.dr-POAbDkaed0tEsHGU2q1FChOhAn5wXhxy-55m7MAQ";

// Student ID format: every roster ID looks like 2508xxxx (8 digits).
// The admin ID is handled separately in js/accounts.js.
const SCHOOL_ID_PREFIX = "2508";
const SCHOOL_ID_RE = /^2508\d{4}$/;

// Item categories shown in the report form and browse filters
const CATEGORIES = [
  {id:'electronics', label:'Electronics', icon:'laptop', examples:'MacBook, charger, phone, TWS, headset, modem, flash disk, watch'},
  {id:'wearables',   label:'Wearables',   icon:'shirt', examples:'Shirt, shoes, glasses'},
  {id:'stationery',  label:'Stationery',  icon:'book', examples:'Book, paper, novel, bag'},
  {id:'accessories', label:'Accessories', icon:'sparkles', examples:'Makeup, skincare, perfume, wallet'},
  {id:'misc',        label:'Misc',        icon:'backpack', examples:'Money, name tag, etc'},
  {id:'other',       label:'Other',       icon:'help-circle', examples:'Anything else'},
];

// Picks a nicer icon based on words in the item name
const KEYWORD_ICON = [
  [/macbook|laptop/i,'laptop'], [/charg|adapt/i,'plug'], [/watch/i,'watch'], [/phone/i,'smartphone'],
  [/earphone|tws|headset|airpod/i,'headphones'], [/glass/i,'glasses'], [/shoe|sneaker/i,'footprints'],
  [/novel|book/i,'book-open'], [/wallet/i,'wallet'], [/bag/i,'backpack'], [/nametag|tag/i,'id-card'],
  [/money|cash/i,'banknote'], [/shirt|jacket/i,'shirt'], [/comb/i,'scissors'], [/flashdisk|usb/i,'usb'],
  [/modem/i,'wifi'], [/perfume/i,'spray-can'], [/makeup|skincare/i,'sparkles'],
];
