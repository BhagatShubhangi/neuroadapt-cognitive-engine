# 🧠 NEUROADAPT

**NEUROADAPT** is a real-time cognitive performance engine designed in the form of an interactive typing-based game.

Rather than measuring speed alone, the system models cognitive state dynamically using multiple performance dimensions and adaptive difficulty scaling.

The result is a browser-based simulation of reaction pressure, accuracy control, and performance stability.


It is a real-time cognitive performance engine that:

- Measures reaction speed
- Tracks typing efficiency
- Calculates adaptive accuracy
- Detects flow state
- Computes stability variance
- Dynamically adjusts difficulty
- Evolves user cognitive profile over sessions


## 🎯 Core Features

### ⚡ Adaptive Difficulty System
Word complexity dynamically scales based on cognitive score.

### 🧠 Multi-Metric Cognitive Engine
Each session calculates:
- Reaction Score
- Typing Score
- Accuracy Score
- Stability Score
- Final Cognitive Score (weighted model)

### 📈 Flow State Detection
Identifies performance streaks and applies combo multipliers.

### 🧬 Persistent Brain Profile
- Tracks lifetime sessions
- Stores average cognitive score
- Records peak performance
- Handles level progression
- Saves data using `localStorage`

### 🔁 Real-Time Cognitive Trend Graph
Visual feedback loop of performance changes.

### 🏆 Level System
Ranks progress from beginner tiers to advanced cognitive operator levels.


## 📊 Cognitive Model

Final Score is calculated using weighted components:

```
Cognitive Score =
  (Reaction × weight)
  × (Typing × weight)
  × (Accuracy × weight)
  × (Stability × weight)
  × Flow Bonus
```

Difficulty scaling dynamically adjusts:
- Word length
- Word complexity
- Time window
- Cognitive pressure

It explores:

| Metric | Description |
|---|---|
| Reaction Latency | How quickly you respond to stimuli |
| Performance Variance | Consistency across attempts |
| Accuracy Under Pressure | Precision as difficulty scales |
| Adaptation Over Time | Long-term cognitive improvement |

This makes it closer to a **training simulator** than a game.

## 🧪 Getting Started

```bash
git clone https://github.com/your-username/neuroadapt.git
cd neuroadapt
open index.html
```

Or use **Live Server** in VS Code for hot reloading.



## 🎮 Gameplay Loop

```
1. Initialize sequence
2. React to presented word
3. Type within time limit
4. System evaluates performance
5. Difficulty adapts
6. Cognitive profile updates
```



