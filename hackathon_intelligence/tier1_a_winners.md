# Tier 1-A Hackathon Winners (2024-2025)

## PennApps XXV (2024)

### [PennApps XXV 2024] - Watchful.AI
* Award: Most Technically Complex Hack, Best Privacy/Security Hack
* Core Problem: Preventing campus security threats through real-time, automated video surveillance and anomaly detection.
* Mechanism: Routes live video frames through a CLIP embedding pipeline to generate semantic vectors stored in ChromaDB. A GPT-based analysis module performs high-level reasoning on detected objects (e.g., weapons) to trigger instant security alerts.
* Frontend: Web-based security dashboard
* Backend and Infrastructure: Python, OpenCV
* AI and Orchestration: CLIP (embeddings), ChromaDB (vector database), GPT-4 (reasoning)
* Source Code: https://github.com/Yatsz/PennApps2024

### [PennApps XXV 2024] - SurgeVue
* Award: 3rd Place Overall, Best AR/VR Hack
* Core Problem: Improving precision in neurosurgery by providing real-time tumor visualization and instrument tracking.
* Mechanism: Employs a Swift/SceneKit frontend to overlay 3D tumor models onto the surgical field based on PyTorch-driven classification. Instrument tracking is synchronized via Arduino-connected gyroscopes and processed through a Flask backend.
* Frontend: iOS AR Application (Swift, SceneKit)
* Backend and Infrastructure: Flask, Python, Arduino integration
* AI and Orchestration: PyTorch (tumor classification), OpenCV (image processing)
* Source Code: https://github.com/jeet-dekivadia/SurgeVue

### [PennApps XXV 2024] - Optica
* Award: 2nd Place Super Fast AI Track (Cerebras), Best Community Impact, Best Use of Computer Vision
* Core Problem: Providing a multimodal navigation and environmental awareness gateway for the visually impaired.
* Mechanism: Leverages on-device Google MLKit for initial computer vision tasks and routes complex queries to Llama 3.1 running on Cerebras hardware for ultra-low latency scene description.
* Frontend: Android Mobile (Java)
* Backend and Infrastructure: Cerebras Inference Infrastructure
* AI and Orchestration: Llama 3.1 (via Cerebras), Google MLKit, TuneStudio
* Source Code: https://github.com/ddiyas/OpticaV2

### [PennApps XXV 2024] - SurgiScan
* Award: 1st Place Patient Safety Technology (Top Category Award)
* Core Problem: Eliminating "Retained Surgical Items" by tracking medical instruments during surgical procedures.
* Mechanism: Uses a YOLOv5 computer vision pipeline to maintain a real-time count of surgical tools as they enter and leave the surgical field. The system cross-references detections with a stateful inventory to ensure 100% accountability before closure.
* Frontend: DATA UNAVAILABLE
* Backend and Infrastructure: Python, OpenCV, NumPy
* AI and Orchestration: YOLOv5 (PyTorch)
* Source Code: https://github.com/ShauryaKumarr/SurgiScan

## HackMIT 2024

### [HackMIT 2024] - Nested
* Award: 1st Place Overall, Best Use of Convex
* Core Problem: Creating a collaborative, recursive operating system environment for multi-user workspace management.
* Mechanism: Implements an iframe-based recursion model allowing the desktop environment to run within itself indefinitely. State synchronization, cursor tracking, and file system persistence are managed through Convex's real-time reactive backend.
* Frontend: React (Next.js), Tailwind CSS
* Backend and Infrastructure: Convex (Real-time state engine), Vercel
* AI and Orchestration: DATA UNAVAILABLE
* Source Code: https://github.com/james-liang/nested

### [HackMIT 2024] - Palm Labs
* Award: Winner in Education Track
* Core Problem: Improving American Sign Language (ASL) learning through interactive, real-time feedback on user hand signs.
* Mechanism: Extracts text from active browser sessions via a Chrome extension and translates it into ASL practice prompts. User hand movements are captured via webcam and verified against a custom-trained PyTorch model for real-time correction.
* Frontend: React/Next.js, Chrome Extension
* Backend and Infrastructure: FastAPI, Node.js, Convex, PostgreSQL
* AI and Orchestration: PyTorch (Hand detection), Llama 3.1 (Text processing via Tune HQ)
* Source Code: DATA UNAVAILABLE

### [HackMIT 2024] - ArthasAI
* Award: Best Use of GenAI (InterSystems IRIS)
* Core Problem: Providing cognitive support and memory management for individuals suffering from Alzheimer's.
* Mechanism: Stores structured and unstructured patient data in InterSystems IRIS Vector Search. GenAI agents act as a retrieval layer to provide contextual reminders and answer questions based on the patient's history and current environment.
* Frontend: DATA UNAVAILABLE
* Backend and Infrastructure: InterSystems IRIS, Python
* AI and Orchestration: InterSystems IRIS Vector Search, GPT-4o
* Source Code: https://github.com/v-sh-kumar/Arthas-AI

## Note on 2025 Events
As of early 2025, PennApps XXVI and HackMIT 2025 are scheduled for September 2025. No winners or project submissions are available for these iterations at this time.
