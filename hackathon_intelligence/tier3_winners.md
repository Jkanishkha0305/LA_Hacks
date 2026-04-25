### MHacks 17 (2024) - V²/R
* Award: Grand Prize Winner (1st Place)
* Core Problem: Students in engineering labs often lack safe, repeatable, and resource-free environments to experiment with high-voltage or complex DC circuit breadboarding.
* Mechanism: The application uses a Unity-based VR environment to simulate the EECS 1016 lab, providing a virtual breadboard with physics-accurate components. It routes user interaction data through a real-time circuit simulation engine that calculates voltage drops and current flow, providing visual feedback (e.g., LED illumination or virtual smoke) based on the circuit's validity.
* Frontend: Unity, Meta Quest SDK, C#
* Backend and Infrastructure: DATA UNAVAILABLE (Local VR Execution)
* AI and Orchestration: DATA UNAVAILABLE
* Source Code: https://mhacks-17.devpost.com/project-gallery

### MHacks 19 (2025) - EchoVision
* Award: 1st Place Overall
* Core Problem: Visually impaired individuals struggle with real-time navigation and obstacle detection in unfamiliar, dynamic environments.
* Mechanism: The architecture integrates a camera-mounted wearable with an NVIDIA Jetson Nano for edge-based computer vision processing. Visual data is streamed to an OpenAI VLM for scene description, and distance data is calculated via OpenCV, with the final spatial guidance delivered through high-fidelity bone-conduction audio using ElevenLabs.
* Frontend: Python (OpenCV Integration), NVIDIA Jetson SDK
* Backend and Infrastructure: Docker, NVIDIA Jetson Nano (Local Edge)
* AI and Orchestration: OpenAI VLM (GPT-4o/Vision), ElevenLabs TTS API, Google Maps API
* Source Code: https://github.com/athinshetty/EchoVision

### HackGT 11 (2024) - Symphony
* Award: 2nd Place Overall
* Core Problem: Real-time collaborative music production suffers from high latency and fragmented version control when multiple users attempt to compose together.
* Mechanism: The system uses a WebSocket-based event bus to synchronize MIDI and playback states across distributed clients in under 50ms. Data is routed through a Node.js coordinator that manages session state in MongoDB and proxies audio streams from the Spotify Web API for reference tracks.
* Frontend: React, TypeScript, Tailwind CSS, Framer Motion
* Backend and Infrastructure: Node.js, Express, MongoDB (Mongoose), Socket.io, Docker
* AI and Orchestration: Spotify Web API, OpenAI API (for melody suggestions)
* Source Code: https://github.com/Philhobs/Sound-To-Symphony

### HackGT 12 (2025) - Waste2Taste
* Award: 1st Place (MLH - Best Use of Snowflake API)
* Core Problem: University dining halls generate massive amounts of food waste due to a lack of data on student preferences and consumption patterns.
* Mechanism: A Raspberry Pi 5 with a Pi camera captures images of returned plates at dish belts, which are then processed by an OWL-ViT model to identify and quantify leftovers. This waste data is streamed to Supabase and then ingested by Snowflake Cortex for trend analysis, finally generating repurposed recipe suggestions for chefs via a LLM-based RAG system.
* Frontend: React, TypeScript, Tailwind CSS
* Backend and Infrastructure: Python (FastAPI), Supabase, Snowflake Data Cloud
* AI and Orchestration: OWL-ViT (Object Detection), Snowflake Cortex, OpenAI (Recipe Generation)
* Source Code: https://github.com/NavadeepBudda/waste2taste

### HackIllinois 2024 - Nested
* Award: Overall 1st Place (HackOlympian Path)
* Core Problem: Relocating to a new city is highly research-intensive and often fails to account for a user's specific daily lifestyle and location habits.
* Mechanism: The platform ingests a user's exported Google Maps search and location history to build a preference profile (e.g., frequency of gym visits, grocery preferences). This profile is then used by a vector-based ranking engine to score neighborhoods in the target city by proximity and quality of matching amenities.
* Frontend: React, TypeScript, Mapbox GL JS
* Backend and Infrastructure: Python (Flask), PostgreSQL, AWS
* AI and Orchestration: OpenAI GPT-4 (Semantic Analysis of Location Data), Gemini 1.5 Pro
* Source Code: https://github.com/Yash-S-S/Nested

### HackIllinois 2025 - Gesture-Controlled Construction Robot
* Award: 1st Place (John Deere Autonomous Vehicles Track)
* Core Problem: Communication on loud construction sites is difficult, leading to safety hazards and inefficient heavy machinery operation.
* Mechanism: The robot utilizes a camera-based vision system that streams video frames to a Raspberry Pi 4B running MediaPipe for real-time hand gesture recognition. Validated gestures are translated into control commands and routed over a ROS2 (Robot Operating System) bridge to DC motor drivers for precise autonomous navigation and articulation.
* Frontend: DATA UNAVAILABLE (Physical Hardware Controller)
* Backend and Infrastructure: Python, ROS2 (Robot Operating System), Raspberry Pi 4B
* AI and Orchestration: MediaPipe (Hand Gesture Recognition), OpenCV
* Source Code: https://github.com/HackIllinois/2025-ios-challenge-starter-code (Reference Organization)

### Bitcamp 2024 - ResQVision
* Award: Best use of AI/ML Innovation
* Core Problem: Disaster response teams lack the ability to quickly survey large-scale debris fields to identify survivors and structural vulnerabilities from aerial footage.
* Mechanism: The architecture processes drone-captured video streams using a PyTorch-based YOLOv8 pipeline to detect humans and quantify debris volume in real-time. Results are mapped onto a geospatial dashboard using Google Maps API, with building damage assessment reports generated via LLM analysis of high-resolution stills.
* Frontend: React.js, Google Maps API
* Backend and Infrastructure: Flask (Python), MongoDB, PyTorch
* AI and Orchestration: YOLOv8 (Object Detection), Gemini Pro (Structural Damage Assessment), PyTorch
* Source Code: https://github.com/NSP909/cmdfmydebris

### Bitcamp 2025 - Neoiser
* Award: Best Moonshot Hack
* Core Problem: College students face complex, fragmented academic requirements that are difficult to navigate using static degree audits.
* Mechanism: The advisor uses a multi-agent orchestration layer (built on Gemini 2.0 Flash) to parse university course catalogs and student transcripts into a structured knowledge graph. Data is routed through a Flutter-based frontend that allows for natural language queries and dynamic "what-if" scheduling scenarios based on real-time course availability.
* Frontend: Flutter, Dart
* Backend and Infrastructure: Node.js, Google Cloud Platform
* AI and Orchestration: Gemini 2.0 Flash, Google Search API
* Source Code: https://bitcamp2025.devpost.com/project-gallery
