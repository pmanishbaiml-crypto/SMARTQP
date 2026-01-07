# 🚀 How to Run SmartQPGen

## 1️⃣ Initial Setup (First Time Only)
Run these commands only once to set up your environment.

### Step 1: Navigate to the backend directory
```powershell
cd "d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\backend"
```

### Step 2: Create Virtual Environment (using Python 3.10)
We use Python 3.10 specifically to avoid dependency issues.
```powershell
& "C:\Users\manis\AppData\Local\Programs\Python\Python310\python.exe" -m venv venv
```

### Step 3: Activate Virtual Environment
```powershell
.\venv\Scripts\activate
```

### Step 4: Install Dependencies
```powershell
pip install -r requirements.txt
```

---

## 2️⃣ Routine Run (After Setup)
Run these commands whenever you want to start the application.

### Step 1: Navigate to backend (if not already there)
```powershell
cd "d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\backend"
```

### Step 2: Activate Virtual Environment
```powershell
.\venv\Scripts\activate
```

### Step 3: Run the Application
```powershell
python app.py
```

The application will start at: http://127.0.0.1:5000
