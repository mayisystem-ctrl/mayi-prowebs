/**
 * May I - prowebs Content Configuration File
 * --------------------------------------------------
 * קובץ התוכן הראשי של האתר.
 * כל השינויים של הטקסטים, הפרויקטים והשאלון בטופס מתבצעים כאן
 * ללא צורך בנגיעה בקוד ה-HTML או ה-CSS.
 */

export const SITE_CONTENT = {
  meta: {
    title: "May I | אתרי פרימיום והנדסת קוד חסרת פשרות",
    description: "אתרי פרימיום למותגים שרוצים להיראות בדיגיטל בדיוק כמו שהם במציאות: יוצאי דופן.",
    lang: "he",
    dir: "rtl"
  },
  
  hero: {
    eyebrow: "This just in:",
    title: "האתר שלך צריך למכור אותך, והרבה יותר טוב מעכשיו.",
    subtitle: "אתרי פרימיום עבור מותגים שרוצים להיראות בדיגיטל בדיוק כמו שהם במציאות: יוצאי דופן.",
    cta: "מתחילים מכאן"
  },
  
  manifest: {
    title: "Defying the status quo",
    subtitle: "אנחנו לא רודפים, אנחנו נבחרים.",
    text: "עסקים קטנים משתמשים בתבניות גנריות. מותגי על מהנדסים את הנוכחות שלהם. אנחנו בונים אתרים נקיים מקוד מנופח, מהירים בצורה קיצונית, ומעוצבים בדיוק מול הקהל האיכותי ביותר שלך. בלי וורדפרס, בלי אלמנטור. רק הנדסת Frontend עילית שמביאה תוצאות."
  },
  
  portfolio: {
    title: "פרויקטים נבחרים",
    subtitle: "עבודות נבחרות המשלבות קוד נקי, מהירות טעינה וחווית משתמש ללא פשרות.",
    items: [
      {
        id: "noa-gross",
        title: "Noa Gross Photography",
        category: "Creative Portfolio",
        description: "אתר פורטפוליו אינטראקטיבי לצלמת אופנה פרימיום, המשלב גלריות מבוססות WebP וטעינה עצלה מתקדמת.",
        image: "assets/noa-gross-thumb.webp",
        link: "../noa-gross photography/index.html"
      },
      {
        id: "aurelia-yachts",
        title: "Aurelia Yachts",
        category: "Luxury E-Commerce",
        description: "מערכת דיגיטלית להשכרת יאכטות יוקרה עם ניווט ויזואלי מהיר וממשק הזמנות מותאם אישית.",
        image: "assets/aurelia-thumb.webp",
        link: "../aurelia-yachts/index.html"
      },
      {
        id: "mayi-crm",
        title: "Custom CRM Dashboard",
        category: "Business Systems",
        description: "לוח בקרה אינטראקטיבי מבוסס Vanilla JS לניהול לידים ואוטומציות עסקיות בזמן אמת.",
        image: "assets/crm-thumb.webp",
        link: "#"
      }
    ]
  },
  
  footer: {
    credit: "נבנה ועוצב באהבה על ידי May I - המערכת העסקית שלך 2026",
    creditLink: "https://mayi.dev/prowebs"
  }
};
