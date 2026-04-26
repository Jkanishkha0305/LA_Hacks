# Hackathon Intelligence: Tier 2 Winners (2024-2025)

## Hack the North (University of Waterloo)

### [Hack the North 2024] - PathSense
* Award: Grand Winner (1st Place Overall), 1st Place Best Use of Cohere
* Core Problem: Visually impaired individuals struggle with autonomous navigation in complex, unfamiliar indoor environments without tactile or human assistance.
* Mechanism: The system captures 1080p video from a shoulder-mounted camera and uses Dense Prediction Transformers (DPT) for depth estimation and Detectron for object detection. It semantically reranks detected entities using the Cohere Rerank API and maps them to indoor floor plans via the Mappedin SDK to generate real-time verbal guidance.
* Frontend: Next.js, TypeScript, Tailwind CSS
* Backend and Infrastructure: Python, Convex (Database), Groq (Whisper for STT), Unreal Engine (TTS)
* AI and Orchestration: GPT-4o mini (Scene Analysis), Detectron (Object Detection), DPT (Depth Estimation), Cohere Rerank API, Voiceflow (Conversation Management)
* Source Code: https://github.com/akjadhav/hackthenorth-2024

### [Hack the North 2024] - Stealth Startup
* Award: Finalist (Top 12)
* Core Problem: Modern startup creation involves high overhead and coordination costs for simple business validation and initial MVP development.
* Mechanism: A multi-agent orchestration framework where autonomous AI agents assume roles (CEO, CTO, Designer) and collaborate in a shared state environment. The system dynamically generates business strategies, branding assets, and functional code repositories through iterative agent-to-agent feedback loops.
* Frontend: React, TypeScript
* Backend and Infrastructure: Node.js, Python, GitHub API (for autonomous repo creation)
* AI and Orchestration: OpenAI GPT-4o, Custom Agentic Workflow (simulated roles)
* Source Code: https://github.com/rajansagarwal/stealth-startup

---

## LA Hacks (UCLA)

### [LA Hacks 2025] - Lumos (LumosCare)
* Award: Overall Winner, 1st Place AI Agents League (Fetch.ai)
* Core Problem: Alzheimer's patients suffer from acute memory loss and disorientation, requiring constant, resource-heavy caregiver supervision.
* Mechanism: The platform integrates AR (Snap Spectacles) for real-time facial recognition and contextual memory overlays for patients. A decentralized network of Fetch.ai uAgents handles safety monitoring (GPS geofencing), healthcare decision support, and automated journaling of daily interactions.
* Frontend: React Native (Caregiver App), Snap Spectacles AR Interface (Patient View)
* Backend and Infrastructure: Node.js, FastAPI, OpenCV (Facial Recognition)
* AI and Orchestration: Fetch.ai uAgents (Multi-agent orchestration), Google Gemini 1.5 Pro, OpenAI GPT-4o
* Source Code: https://github.com/pb2323/Lumos

### [LA Hacks 2024] - Simply Home
* Award: Fetch.ai Grand Prize (1st Place)
* Core Problem: Existing smart home systems are reactive and require manual configuration, failing to anticipate user needs or optimize complex cross-device workflows.
* Mechanism: An agentic home automation system that utilizes the Fetch.ai uAgents framework to create autonomous communication channels between disparate IoT devices. It employs a self-improving loop based on the Toolformer architecture to autonomously select and execute the most efficient tool chain for fulfilling complex natural language user requests.
* Frontend: TypeScript, React
* Backend and Infrastructure: Fetch.ai uAgents, Node.js
* AI and Orchestration: Google Gemini 1.5 Pro, uAgents Framework, Toolformer-inspired Agent Logic
* Source Code: https://github.com/joshua-demo/simply-home

### [LA Hacks 2025] - Bandaid Maps
* Award: Winner of the Melissa Data Challenge
* Core Problem: Students and travelers often lack immediate, location-aware knowledge of healthcare accessibility and emergency readiness in unfamiliar areas.
* Mechanism: The application calculates a "Health Readiness Score" (0-100) by processing real-time location data against the Melissa Global Lookups and Cloud APIs. It routes user location data through Google Gemini Pro to generate tailored emergency action plans and filters for 24/7 healthcare facilities using FastAPI.
* Frontend: React, Tailwind CSS
* Backend and Infrastructure: FastAPI (Python), Melissa Lookups/Cloud APIs
* AI and Orchestration: Google Generative AI (Gemini Pro)
* Source Code: https://github.com/GovindKurapati/bandaid-maps

---

## HackNYU (New York University)

### [HackNYU 2025] - AutoTrust
* Award: 1st Place Overall Winner, 1st Place Solana & Blockchain Innovation
* Core Problem: The used car market is plagued by high middleman fees, lack of transparency in title transfers, and fragmented service histories.
* Mechanism: A decentralized marketplace on the Solana blockchain that mints unique NFTs to represent vehicle titles and maintenance logs. The system features an AI voice agent "salesman" that interfaces with the Solana Agent Kit to execute on-chain transfers and respond to buyer inquiries using natural language.
* Frontend: Next.js, TypeScript, Tailwind CSS
* Backend and Infrastructure: FastAPI, Solana (Rust/Anchor Smart Contracts), MongoDB
* AI and Orchestration: OpenAI GPT-4o, Deepgram (STT), ElevenLabs (TTS), Solana Agent Kit
* Source Code: DATA UNAVAILABLE (Core logic verified via Shashank Bezgam and Tejas Chakrapani project profiles)

### [HackNYU 2024] - Nested
* Award: Overall 1st Place Winner
* Core Problem: Relocating to a new city often involves a mismatch between neighborhood amenities and a user's actual lifestyle habits.
* Mechanism: The platform ingests and analyzes a user's Google Maps search and location history to build a lifestyle profile. It then cross-references this profile against neighborhood-level data using vector embeddings to rank and match locations based on proximity to the user's most-frequented types of venues (e.g., specific gym types, niche cafes).
* Frontend: React, TypeScript
* Backend and Infrastructure: Node.js, Express, Python
* AI and Orchestration: Azure OpenAI Service, Vector Embeddings (for neighborhood matching)
* Source Code: https://github.com/TechAtNYU/Nested (Verified via HackNYU Devpost)

### [HackNYU 2025] - Pickle
* Award: Best Use of Gen-AI
* Core Problem: "Decision fatigue" in daily choices (food, travel, tasks) leads to productivity loss and suboptimal life choices.
* Mechanism: A decision-assistant built with a Flutter frontend and Flask backend that utilizes LLMs to process multi-modal user preferences. It employs Python's serialization (Pickle) for local preference state management and calls the OpenAI API to perform prioritized reasoning for task and recommendation ranking.
* Frontend: Flutter (Dart)
* Backend and Infrastructure: Flask (Python)
* AI and Orchestration: OpenAI GPT-4, Custom Recommendation Reasoning Loop
* Source Code: https://github.com/arnabbhowal/Pickle
