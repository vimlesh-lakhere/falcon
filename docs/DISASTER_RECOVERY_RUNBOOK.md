# 🚨 Falcon ERP — 5-Minute Fast Disaster Recovery Guide (Zero Data Loss)

> **लक्ष्य (Goal):** अगर मुख्य डेटाबेस डिलीट हो जाए या होस्टिंग बैन/क्रैश हो जाए, तो **5 से 7 मिनट के अंदर पूरे सिस्टम को 100% डेटा के साथ नए अकाउंट पर रीस्टार्ट करना**।

---

## ⚡ 5-Minute Quick Action Checklist

| मिनट | स्टेप | क्या करना है? |
|---|---|---|
| **0 - 1 Min** | **Step 1: Backup डाउनलोड** | Settings → Backup से `falcon_backup_YYYY-MM-DD.json` डाउनलोड करें। |
| **1 - 3 Min** | **Step 2: नया Supabase बनाएं** | नए Gmail से Supabase पर `falcon-erp` प्रोजेक्ट बनाएं और Keys कॉपी करें। |
| **3 - 4 Min** | **Step 3: Schema DDL चलाएं** | Supabase SQL Editor में [`database/schema_master.sql`](file:///e:/Falcon/database/schema_master.sql) पेस्ट करके `Run` करें। |
| **4 - 5 Min** | **Step 4: Data Restore करें** | CLI या UI के ज़रिए JSON बैकअप को नए डेटाबेस में इंजेक्ट करें। |
| **5 - 7 Min** | **Step 5: Vercel / Netlify कनेक्ट** | नए प्रोजेक्ट में Environment Variables पेस्ट करें और `Deploy` करें। |

---

## 🛠️ Step-by-Step Restoration (Step-by-Step Guide)

### Step 1: Backup JSON फ़ाइल प्राप्त करें (30 Seconds)
- **विकल्प A (सबसे तेज़):** लाइव ऐप में जाएं → **Settings** → **💾 Backup & Disaster Recovery** → **`Download Full Backup (JSON)`** पर क्लिक करें। फ़ाइल आपके डाउनलोड्स फोल्डर में आ जाएगी।
- **विकल्प B:** अगर ऐप पूरी तरह बंद है, तो अपनी Google Drive में जाएं (`Falcon_ERP_Backups` फ़ोल्डर) और सबसे ताज़ा `.json` फ़ाइल डाउनलोड करें।

---

### Step 2: नया Supabase Database बनाएं (90 Seconds)
1. [Supabase Dashboard](https://supabase.com/dashboard) खोलें (किसी भी नए Gmail से लॉगिन करें)।
2. **`New Project`** पर क्लिक करें:
   - **Name:** `falcon-erp-recovery`
   - **Database Password:** कोई भी मजबूत पासवर्ड डालें।
   - **Region:** `South Asia (Mumbai)` चुनें।
3. प्रोजेक्ट बनने के बाद **Project Settings** → **API** में जाएं और ये 3 चीज़ें कॉपी करें:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **`anon` `public` Key**
   - **`service_role` `secret` Key**
4. **Authentication** → **Providers** → **Email** में जाकर **`Confirm email`** को **OFF** करके Save कर दें (ताकि बिना ईमेल वेरिफाई किए तुरंत लॉगिन हो सके)।

---

### Step 3: Schema DDL रन करें (30 Seconds)
1. Supabase Dashboard में बाएँ मेनू से **`SQL Editor`** खोलें।
2. **`+ New query`** पर क्लिक करें।
3. अपने प्रोजेक्ट की [**`database/schema_master.sql`**](file:///e:/Falcon/database/schema_master.sql) का पूरा कोड कॉपी करके पेस्ट करें।
4. **`Run` (Ctrl + Enter)** दबाएं।
   - *नोट:* इस फाइल में सभी टेबल्स, ट्रिगर्स, रोल्स और ऑटो-एडमिन ट्रिगर (`handle_new_user`) पहले से शामिल हैं।

---

### Step 4: Data Restore करें (45 Seconds)
अपने कंप्यूटर के Terminal (PowerShell) में यह सिंगल कमांड रन करें (Keys को अपने नए Supabase क्रेडेंशियल्स से बदलें):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://YOUR_NEW_PROJECT.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="YOUR_NEW_SERVICE_ROLE_KEY"; node scripts/restore-from-backup.js "C:\Users\vlakh\Downloads\falcon_backup_YYYY-MM-DD.json"
```

✅ **परिणाम:** सभी 379+ प्रोडक्ट्स, कस्टमर्स, सेल्स, इनवॉइस और स्टॉक्स 30 सेकंड में रिस्टोर हो जाएंगे।

---

### Step 5: Vercel / Netlify पर Re-Deploy करें (2 Minutes)
1. Vercel या Netlify Dashboard में जाएं और नया प्रोजेक्ट बनाएं (GitHub `Falcon` repo से कनेक्ट करें)।
2. **Environment Variables** में ये 4 मुख्य वेरिएबल्स पेस्ट करें:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_NEW_SERVICE_ROLE_KEY
   DEFAULT_SHOP_ID=a0000000-0000-0000-0000-000000000001
   ```
3. **Deploy** पर क्लिक करें।
4. डिप्लॉयमेंट खत्म होते ही ऐप खोलें और **Register** पेज से नया अकाउंट बनाएं — आप सीधे **Admin ERP & POS** में पहुंच जाएंगे!

---

## ⚠️ सामान्य गलतियाँ और त्वरित समाधान (Troubleshooting Tips)

1. **`Failed to fetch` एरर:**
   - इसका मतलब है कि Environment Variables सेव करने के बाद प्रोजेक्ट को **Redeploy** नहीं किया गया। हमेशा Vercel/Netlify पर `Redeploy (Clear Cache)` जरूर करें।
2. **लॉगिन के बाद सीधे `/store` पर रिडायरेक्ट होना:**
   - इसका मतलब नए यूज़र को `Owner` रोल नहीं मिला था। अब हमने `schema_master.sql` में ऑटो-ओनर ट्रिगर जोड़ दिया है जिससे कोई भी नया साइनअप अपने आप Owner बन जाएगा।
3. **Products स्टोर पर न दिखना:**
   - अब `schema_master.sql` में डिफ़ॉल्ट परमिशन ग्रांट्स पहले से मौजूद हैं, इसलिए कभी भी RLS की समस्या नहीं आएगी।


---

## 🛡️ Daily Operational Best Practices
- **Daily Automated Cloud Backup**: GitHub Action har raat 02:00 AM IST par Google Drive me snapshot sync karega.
- **Weekly Manual Export**: Sunday ko ek baar Settings page se "Download Full Backup" par click karke apne PC/pen-drive me copy rakh sakte hain.
- **Pre-Update Backup**: Kisi bhi bade bulk catalog upload ya price change se pehle Settings page se 1-click snapshot lein.
