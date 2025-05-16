# Signify-ISL 📚🧏‍♂️

<!--toc:start-->
- [Signify-ISL 📚🧏‍♂️](#signify-isl-📚🧏‍️)
  - [🔥 Features](#🔥-features)
  - [🏫 Use Case: Online Classrooms for Deaf Students](#🏫-use-case-online-classrooms-for-deaf-students)
  - [🛠️ Tech Stack](#🛠️-tech-stack)
  - [🌁 Diagram](#🌁-diagram)
  - [🚀 How to Run Locally](#🚀-how-to-run-locally)
<!--toc:end-->

**Signify-ISL** is a powerful, AI-driven communication and educational platform that translates Indian Sign Language (ISL) into text and speech in real-time. It's designed to support inclusive online education for the Deaf and hard-of-hearing community. Our mission is to make learning as seamless and accessible as possible for everyone—especially in virtual classroom environments.

🌐 [Live Demo](https://signify-isl.vercel.app/)

---

## 🔥 Features

- **🧠 Real-Time ISL Translation**  
  Uses computer vision and machine learning to detect Indian Sign Language and convert it into both text and speech instantly.

- **🎥 ISL-Powered Video Calling (Online Classroom)**  
  Host or join online video classrooms. Teachers can deliver lectures while ISL is translated on-screen, allowing students with hearing impairments to follow along in real-time.

- **🎓 Interactive ISL Learning Platform**  
  Learn Indian Sign Language through structured lessons, gesture demos, and quizzes. Track your learning progress.

- **🌍 Multi-Language Support**  
  Translate ISL to multiple Indian languages for broader inclusivity and understanding.

- **🔐 User Authentication**  
  Students and teachers can register and log in to personalize their learning or teaching experience.

---

## 🏫 Use Case: Online Classrooms for Deaf Students

This project can be extended into a **complete online learning platform like Physics Wallah**, where:

- Teachers conduct **live classes** via the video call interface.
- Students view **real-time ISL translations**.
- Additional features like **class scheduling, notes, assignments**, and **recorded lectures** can be integrated.

Ideal for schools, colleges, and online educators focused on **inclusive education**.

---

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend & AI/ML**: Python, Flask, PyTorch , OpenCV
- **Hosting**: Vercel

---

## 🌁 Diagram

![image](https://github.com/user-attachments/assets/f859e8aa-ae97-43d2-a82c-91bddede6683)

## 🚀 How to Run Locally

1. Clone the repository:

  ```bash
  git clone https://github.com/finefigo/signify-isl.git
  cd signify-isl
  ```

2. Create a virtual environment and activate:

  ```bash
  python3 -m venv .venv
  # Unix
  source .venv/bin/activate
  # Windos
  source .venv/Scripts/activate
  ```

3. Copy the generated files and run the http server:

  ```bash
  cp model/model.json model/gesture_mapping.json web/
  python -m http.server 8000 -d web
  ```

Open the browser and navigate to `http://localhost:8000/`.
