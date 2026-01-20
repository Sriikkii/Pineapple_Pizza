---
config:
  layout: fixed
---
flowchart TB
 subgraph Infra["Infrastructure"]
        SymbolTable["Symbol Table"]
        ErrorHandle["Error Handler"]
  end
 subgraph Front_End["Phase 1: Front-End (Analysis)"]
    direction TB
        Lexer["Lexer / Tokenizer"]
        Input["GameScript Text"]
        Parser["Parser"]
        Seman["Semantic Analyzer"]
        Infra
  end
 subgraph Simulation_Logic["Simulation Core"]
        RuleRes["Rule Resolver"]
        ExprEval["Expression Evaluator"]
        Easing["Easing Engine"]
  end
 subgraph Optimizer["Phase 2: Optimizer & Simulation"]
    direction TB
        Sampling["Sampling Engine"]
        TimeEval["Time Evaluator"]
        Simulation_Logic
        DeadRule["Dead Rule Elimination"]
  end
 subgraph Back_End["Phase 3: Back-End (Generation)"]
    direction TB
        PropFormat["Property Formatter"]
        KeyGen["Keyframe Builder"]
        CSSGen["CSS Selector Generator"]
        FinalCSS["Final CSS Output"]
  end
    Input --> Lexer
    Lexer -- Tokens --> Parser
    Parser -- AST --> Seman
    Parser -.-> SymbolTable
    Seman -.-> ErrorHandle
    TimeEval -- Step: 16ms --> Sampling
    Sampling --> Simulation_Logic
    Simulation_Logic -- Store t, value --> DeadRule
    DeadRule -- Optimized Data --> KeyGen
    KeyGen -- Builds --> CSSGen
    CSSGen --> FinalCSS

     SymbolTable:::storage
     ErrorHandle:::storage
     Lexer:::component
     Parser:::component
     Seman:::component
     RuleRes:::component
     ExprEval:::component
     Easing:::component
     Sampling:::component
     TimeEval:::component
     DeadRule:::component
     PropFormat:::component
     KeyGen:::component
     CSSGen:::component
    classDef phase fill:#f9f9f9,stroke:#333,stroke-width:2px
    classDef component fill:#e1f5fe,stroke:#0277bd,stroke-width:1px
    classDef storage fill:#fff3e0,stroke:#e65100,stroke-width:1px
