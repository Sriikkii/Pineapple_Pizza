---
config:
  layout: fixed
---
flowchart TB
 subgraph Presentation_Layer["User Interface (Presentation Layer)"]
        UI["Visual Timeline Editor"]
        User["User Input"]
  end
 subgraph The_Loop["Frame Execution Loop"]
        Timer["Time Manager (deltaTime)"]
        AgentMgr["Agent Manager"]
        RuleEngine["Rule Evaluator"]
        StateMgr["State Update System"]
  end
 subgraph Core_Layer["Logic Engine (GameScript Model)"]
    direction TB
        Parser["Parser / Initializer"]
        The_Loop
  end
 subgraph Output_Layer["Rendering & Export Layer"]
        Preview["Real-Time DOM Renderer"]
        Compiler["CSS Code Generator"]
        FinalCSS["CSS File Output"]
  end
    User -- Defines --> UI
    UI -- JSON / Object Data --> Parser
    Parser -- Instantiates Agents --> AgentMgr
    Timer -- Triggers Frame --> RuleEngine
    AgentMgr -- Provides Agent Data --> RuleEngine
    RuleEngine -- Applies Logic --> StateMgr
    StateMgr -- Current State x,y,opacity --> Preview
    StateMgr -- State History --> Compiler
    Compiler -- Compiles Keyframes --> FinalCSS

    style Presentation_Layer fill:#f9f9f9,stroke:#333,stroke-dasharray: 5 5
    style Core_Layer fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Output_Layer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
