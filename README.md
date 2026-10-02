# 📺 AchieveDeck — Ambient TV Slideshow Display (2023–2026)

A minimalist, high-visibility digital signage & TV kiosk slideshow website built to continuously showcase year-wise competitive achievements, hackathon championships, and awards on large TV screens (1080p, 4K) with zero required touch interaction.

![Background](https://img.shields.io/badge/Theme-Pure%20White%20Minimal-lightgrey.svg)
![Mode](https://img.shields.io/badge/Mode-TV%20Ambient%20Autoplay-red.svg)
![Typography](https://img.shields.io/badge/Typography-Large%20High%20Legibility-black.svg)
![Status](https://img.shields.io/badge/Status-Running%20on%20Port%203000-brightgreen.svg)

---

## 🎨 Design Philosophy for TV Displays

- **Pure White Background & Minimal Palette**: Pristine `#ffffff` canvas with subtle architectural hairline borders and soft muted tones.
- **Whiteboard Crimson Marker Accent**: Year numbers (`2023`, `2024`, `2025`, `2026`) and key accents styled in muted crimson (`#b91c1c`), reflecting the handwriting on the original whiteboard.
- **TV-Scale Typography**: Extra-large, high-contrast headings (`clamp(5.5rem, 9.5vw, 10.5rem)` for year headers) engineered to be effortlessly read from 10–15 feet across a room.
- **Zero-Touch Continuous Autoplay**: Built specifically for unattended TV monitors. Automatically loops through all year slides every 10 seconds, with an ambient progress line at the bottom.
- **Live Corner Clock**: Displays current time and date in the top-right corner.

---

## 📋 Preloaded Achievements (Transcribed from Whiteboard)

### **2023**
- 🏆 **Smart India Hackathon (SIH)** — Winner (Grand Champion, MoE & AICTE, Govt. of India)

### **2024**
- 🏆 **ISRO Space Hackathon** — Winner (1st Prize, Space & Satellite Tech)
- 🏆 **Arjuna 1.0** — Winner (1st Place)
- 🏆 **E-Summit 2024** — Winner (Entrepreneurship & Pitching)
- 🏆 **IIC Regional Meet** — Winner / Top Innovation Award (MoE Innovation Cell)
- 🏆 **Innofusion 1.0** — Winner (Championship)
- 🥈 **Tech Expo 2024** — 2nd Place
- 🎖️ **Smart India Hackathon (SIH) 2024** — National Finalist

### **2025**
- 🏆 **Diversion Hackathon 2025** — Best AI Hack Winner
- 🏆 **Hack4Bengal** — Finalist & Virtual Hackathon Winner
- 🥈 **Hackspire Hackathon** — 2nd Place & Innovative Track Winner
- 🥈 **Innofusion 2.0** — 2nd Place
- 🥉 **IIT Kharagpur B-Plan Competition** — 2nd Runner-Up (3rd Place)
- 🥉 **Metamorph Hackathon** — 3rd Place
- 🎖️ **Calcutta Hack** — 4th Place Finalist
- 🎖️ **Smart India Hackathon (SIH) 2025** — National Finalist

### **2026**
- 🏆 **IIT-BHU Innovation Expo** — Winner (Grand Champion)
- 🏆 **New Year Colloquium** — 1st Prize Winner
- 🏆 **Heliotropica 2K26** — 1st Winner
- 🌟 **Binary V2 - Algorand Bounty Track** — Bounty Winner (Web3 & Blockchain)
- 🏆 **Binary V2 - Open Innovation Track** — Track Winner
- 🥉 **Binary V2 Overall Championship** — 2nd Runner-Up (3rd Place)

---

## 🚀 How to View on a TV

1. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
2. Press <kbd>F</kbd> (or F11) to switch the browser into **Fullscreen Mode**.
3. Leave it running — it will smoothly cycle through all years and the summary indefinitely.

### Optional Keyboard & Remote Controls
- <kbd>→</kbd> / <kbd>PageDown</kbd>: Next Slide
- <kbd>←</kbd> / <kbd>PageUp</kbd>: Previous Slide
- <kbd>Space</kbd>: Pause / Resume slideshow
- <kbd>F</kbd>: Toggle Fullscreen
- <kbd>M</kbd>: Open Admin Portal

---

## 🔐 Admin Portal

To add, edit, or delete achievements without touching the main TV screen, open:
```
http://localhost:3000/admin.html
```

- Add achievements for any existing or new year.
- Changes are instantly saved and reflected on the TV slideshow.
- Export or Reset data anytime.
