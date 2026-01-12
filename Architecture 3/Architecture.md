---
config:
  layout: fixed
---
flowchart TB
 subgraph Presentation_Layer["Phase 1: Front-End (User Interface)"]
        User["User Input"]
        UI["Visual Timeline Editor"]
        Lexer["Lexer & Tokenizer"]
        Parser["Parser (AST Constructor)"]
  end
 subgraph The_Loop["Sampling Engine (16ms Steps)"]
        Timer["Time Evaluator (#deltaTime)"]
        RuleEngine["Rule Resolver & Expr Evaluator"]
        StateMgr["State Update System"]
        Easing["Easing & Interpolation Engine"]
  end
 subgraph Core_Layer["Phase 2: Optimizer (Simulation Engine)"]
    direction TB
        The_Loop
  end
 subgraph Output_Layer["Phase 3: Back-End (Generation)"]
        Preview["Real-Time DOM Preview"]
        Compiler["CSS Keyframe Generator"]
        FinalCSS["Standard CSS Output"]
  end
    User --> UI
    UI --> Lexer
    Lexer --> Parser
    Timer --> RuleEngine
    RuleEngine --> Easing
    Easing --> StateMgr
    Parser --> Timer
    StateMgr --> Preview & Compiler
    Compiler --> FinalCSS

    style The_Loop fill:#ffffff,stroke:#0277bd,stroke-dasharray: 2 2
    style Presentation_Layer fill:#f9f9f9,stroke:#333,stroke-dasharray: 5 5
    style Core_Layer fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Output_Layer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
