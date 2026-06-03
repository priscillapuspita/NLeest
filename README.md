# NLeest

NLeest is een simpele leeswebapp om Nederlands te oefenen met korte verhalen en Engelse vertaling ernaast.

De app gebruikt geen AI, geen externe API en geen sleutel. Alle verhalen staan lokaal in `data/stories.json`.

## Lokaal starten

Volg deze stappen rustig van boven naar beneden.

### 1. Open Terminal

Ga naar de projectmap:

```bash
cd /Users/priscilla/Documents/Codex/2026-06-01/bouw-het-dashboard-in-4-fases/nederlands-lezen
```

### 2. Maak een virtuele Python-omgeving

```bash
python3 -m venv .venv
```

### 3. Zet de virtuele omgeving aan

```bash
source .venv/bin/activate
```

### 4. Installeer de pakketten

```bash
pip install -r requirements.txt
```

### 5. Start de app lokaal

```bash
python app.py
```

### 6. Open de app in je browser

Ga naar:

```text
http://127.0.0.1:5001
```

### 7. Stop de app

Klik in Terminal en druk op:

```text
Control + C
```

## Startcommando voor Render

Render moet dit startcommando gebruiken:

```bash
gunicorn app:app
```

De app luistert lokaal op poort `5001`. Op Render gebruikt `gunicorn.conf.py` automatisch de poort die Render meegeeft via `PORT`.

## GitHub-repo maken

Als de repo nog niet op GitHub staat, kun je dit zelf doen:

### 1. Maak een nieuwe repo op GitHub

1. Ga naar [github.com](https://github.com).
2. Klik rechtsboven op `+`.
3. Kies `New repository`.
4. Vul als naam in:

```text
nleest
```

5. Kies `Public` of `Private`.
6. Laat `Add a README file` uit.
7. Klik op `Create repository`.

### 2. Push de code naar GitHub

Open Terminal in deze projectmap en voer dit uit:

```bash
git init
git add .
git commit -m "Maak NLeest klaar voor Render v1"
git branch -M main
git remote add origin https://github.com/JOUW-GITHUB-NAAM/nleest.git
git push -u origin main
```

Vervang `JOUW-GITHUB-NAAM` door je eigen GitHub-gebruikersnaam.

## Render koppelen en live zetten

### 1. Maak een gratis Render-account

1. Ga naar [render.com](https://render.com).
2. Log in of maak een account.
3. Koppel Render aan je GitHub-account als Render daarom vraagt.

### 2. Maak een nieuwe webservice

1. Klik in Render op `New`.
2. Kies `Web Service`.
3. Kies de GitHub-repo `nleest`.
4. Vul deze instellingen in:

```text
Name: nleest
Environment: Python
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app
```

5. Kies de gratis optie als Render daarom vraagt.
6. Klik op `Deploy Web Service`.

### 3. Wacht tot de app live is

Render gaat nu de app bouwen. Als alles klaar is, krijg je een link zoals:

```text
https://nleest.onrender.com
```

Open die link om NLeest live te bekijken.

## Een nieuw verhaal toevoegen

Open dit bestand:

```text
data/stories.json
```

Een verhaal ziet er zo uit:

```json
{
  "id": "nieuws-3",
  "topic": "nieuws",
  "title": "Nieuwe markt in de stad",
  "dutch_sentences": [
    "De stad opent zaterdag een nieuwe markt.",
    "Er komen kraampjes met brood, kaas en bloemen."
  ],
  "english_sentences": [
    "The city opens a new market on Saturday.",
    "There will be stalls with bread, cheese and flowers."
  ],
  "new_words": [
    { "word": "markt", "article": "de", "translation": "market" },
    { "word": "kraampje", "article": "het", "translation": "stall" }
  ],
  "level": "B1"
}
```

Belangrijk:

- Kies bij `topic` alleen: `true crime`, `fictie`, `entertainment` of `nieuws`.
- Geef elk verhaal een uniek `id`.
- Zet evenveel Nederlandse zinnen in `dutch_sentences` als Engelse zinnen in `english_sentences`.
- `level` mag `A2`, `B1` of `B2` zijn. Als je `level` weglaat, toont de app standaard `B1`.
- Zet na elk verhaal een komma, behalve na het laatste verhaal in de lijst.

## Extra voorbeeldzinnen toevoegen

Extra voorbeeldzinnen voor het woordenboek staan in:

```text
word_examples.json
```

Een voorbeeld ziet er zo uit:

```json
"bewijs": [
  { "nl": "De politie zoekt nog naar meer bewijs.", "en": "The police are still looking for more evidence." }
]
```

Gebruik als sleutel het Nederlandse woord. Zet bij elke zin `nl` en `en`.

## Mappenstructuur

```text
nederlands-lezen
├── app.py
├── gunicorn.conf.py
├── requirements.txt
├── README.md
├── word_examples.json
├── data
│   └── stories.json
├── static
│   ├── logo.svg
│   ├── css
│   │   └── styles.css
│   └── js
│       └── app.js
└── templates
    └── index.html
```
