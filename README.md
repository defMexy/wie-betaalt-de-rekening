# 🧾 Wie betaalt de rekening?

**Een leven lang zorgverzekerd – van 18 tot 80.**
Een educatieve browsergame over de Nederlandse zorgverzekering, gemaakt voor burgerschap (mbo).

> **Centrale vraag:** Wie betaalt uiteindelijk de rekening wanneer belangen botsen?

▶️ **Speel online:** https://defmexy.github.io/wie-betaalt-de-rekening/ *(werkt zodra GitHub Pages aan staat, zie onderaan)*

---

## Wat is het?

Je speelt één leven, van 18 tot 80 jaar, als **Sem**, **Lisa** of **Daan**. In elke levensfase kies je je zorgverzekering, overkomen je dingen (een griepje, een gebroken been, een nieuwe heup…) en maak je een moeilijke keuze.

Aan het eind krijg je **De Rekening**: wat jij in je hele leven betaalde, en wat je zorg écht kostte. Het verschil laat zien **wie voor wie betaalde**. Daarna zie je hetzelfde leven in twee andere werelden: één waarin iedereen voor zichzelf kiest, en één waarin de overheid alles bepaalt.

## Spelregels

### 🎯 Doel
Kom zo goed mogelijk door je leven, met **genoeg geld** én een **goede gezondheid**.

### 🗓️ 7 levensfasen
18–25 · 25–35 · 35–45 · 45–55 · 55–65 · 65–75 · 75–80

In elke fase doe je drie dingen:

1. **Kies je verzekering**
   - Vrijwillig eigen risico: €0, €250 of €500 extra (hoger = lagere premie, maar meer zelf betalen)
   - Aanvullende verzekering: ja of nee (vergoedt tandarts en fysio)
   - Zorgtoeslag aanvragen: ja of nee (alleen als je inkomen laag genoeg is)
2. **Trek 2 gebeurteniskaarten.** Hoe ouder je wordt, hoe groter de kans op dure zorg. Je ziet steeds precies wat jij betaalt en wat de verzekeraar betaalt.
3. **Maak 1 keuze bij een dilemma.** Na je keuze lees je: *wie profiteert, wie betaalt?*

### 📊 De meters
| Meter | Wat betekent het? |
|---|---|
| 👛 **Portemonnee (€)** | Je geld. Je krijgt inkomen, maar betaalt vaste lasten, premie en zorg. |
| ❤️ **Gezondheid (0–100)** | Ziek worden en ouder worden kost gezondheid. Goede keuzes helpen. |
| 🧾 **Totaal betaald aan zorg** | Premie − zorgtoeslag + eigen risico + zelf betaalde zorg. |

### 💀 Wanneer verlies je?
- Als je gezondheid op **0** komt.
- Als je diep in de schulden raakt: onder **−€5.000**.

Ook dan zie je De Rekening van het leven dat je had.

### ⏱️ Speelduur
Ongeveer 5 minuten per potje.

### ⌨️ Bediening
Muis of touch. Met het toetsenbord: **Enter** of **spatie** = "Volgende". Geluid (kassa) staat standaard uit en zet je aan met de knop rechtsboven.

## Leerdoel: botsende belangen

De game laat zien dat **individueel belang** (zo weinig mogelijk betalen) botst met **collectief belang** (iedereen kan zorg krijgen):

- **Het dilemma:** betaal je mee voor anderen, ook als je zelf gezond bent?
- **Botsende belangen:** jong vs. oud, gezond vs. ziek, verzekeraar vs. patiënt, privacy vs. korting.
- **Wie profiteert:** ouderen en chronisch zieken krijgen zorg die ze nooit zelf kunnen betalen.
- **Wie betaalt de prijs:** jongeren en gezonden betalen meer dan hun zorg kost, en mensen die zorg mijden betalen met hun gezondheid.

De drie karakters laten elk een andere kant zien:

| Karakter | Typische uitkomst |
|---|---|
| ⚽ **Sem** – sportief en gezond | Betaalt tienduizenden euro's méér dan zijn zorg kost. |
| 💼 **Lisa** – gemiddeld | Betaalt als jongere mee, krijgt als oudere meer terug. |
| 🎨 **Daan** – chronisch ziek vanaf 25 | Zijn zorg kost honderdduizenden euro's. Zonder solidariteit (en zorgtoeslag) gaat hij failliet. |

## Zelf openen (lokaal)

De game gebruikt JavaScript-modules. Die werken **niet** als je `index.html` dubbelklikt. Start daarom een kleine webserver in de projectmap:

```bash
npx serve
# of
python -m http.server
```

Open daarna het adres uit je terminal (bijvoorbeeld http://localhost:3000). In VS Code kan het ook met de extensie *Live Server*.

## Bestanden

```
index.html              pagina + kop
css/style.css           alle vormgeving (bonnetjes-thema)
js/main.js              start + schermwissel
js/router.js            simpele schermmanager
js/config.js            ALLE bedragen en feiten op één plek (met bronnen)
js/state.js             spelstatus en alle berekeningen
js/werelden.js          berekening "Wat als…?"
js/storage.js           localStorage (instellingen, highscores, stemmen)
js/sound.js             kassageluid (Web Audio)
js/ui.js                hulpfuncties (bedragen, animaties)
js/debug.js             simuleert 100 potjes per karakter (balans testen)
js/data/                karakters, gebeurtenissen en dilemma's
js/screens/             één bestand per scherm
```

Er is geen database en geen build-stap. Alleen `localStorage` voor instellingen, highscores en de stemmen op dit apparaat.

### Balans testen
```bash
node js/debug.js 100
```
Of open de game met `?debug` achter het adres en kijk in de console (F12).

## Bronnen

- [Rijksoverheid – Zorgverzekering](https://www.rijksoverheid.nl/onderwerpen/zorgverzekering)
- [Zorgwijzer – Zorgverzekering 2027](https://www.zorgwijzer.nl/zorgverzekering-2027)
- [Kassa (BNNVARA) – eigen risico en premie](https://www.bnnvara.nl/kassa/artikelen/lager-eigen-risico-zorgpremie-stijgt-in-2027-naar-200-euro-per-maand)
- [Belastingdienst – Toeslagen (zorgtoeslag)](https://www.belastingdienst.nl/toeslagen)

> ⚠️ Alle bedragen zijn afgerond of indicatief (peiljaar 2026). Controleer ze voor het inleveren in `js/config.js`.

## Online zetten (GitHub Pages)

1. Zet alle bestanden in de repository op GitHub (branch `main`).
2. Ga op GitHub naar **Settings → Pages**.
3. Kies bij *Source*: **Deploy from a branch**.
4. Kies branch **main** en map **/ (root)**, en klik op **Save**.
5. Na een minuutje staat de game op https://defmexy.github.io/wie-betaalt-de-rekening/
