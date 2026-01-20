---
config:
  layout: fixed
---
flowchart LR
 subgraph Front_End["Phase 1: Front-End (Analysis)"]
    direction LR
        Semantic["Semantic
        Analyser"]
        Parser["Parser
        (AST)"]
        Tokenizer["Tokenizer
        (Lexer)"]
  end
 subgraph Optimizer["Phase 2: Optimizer (Simulation)"]
    direction LR
        DeadRule["Dead Rule
        Elimination"]
        Sampling["Sampling Engine
        (Rule Resolver)"]
        TimeEval["Time
        Evaluator"]
  end
 subgraph Back_End["Phase 3: Back-End (Generation)"]
    direction LR
        JSTrigger["JS Runtime
        Trigger"]
        CSSGen["CSS Code
        Generator"]
        Mapper["State Mapper
        (CSS Selectors)"]
  end
 subgraph Infra["Infrastructure Layer (Symbol Tables, Math Lib, Error Handling)"]
  end
    Tokenizer --> Parser
    Parser --> Semantic
    TimeEval --> Sampling
    Sampling --> DeadRule
    Mapper --> CSSGen
    CSSGen --> JSTrigger
    Input(["Input (i/p):
    GameScript Rules"]) --> Front_End
    Front_End --> Optimizer
    Optimizer --> Back_End
    Back_End --> Output[/"Final CSS Output"/]
    Infra -.- Front_End & Optimizer & Back_End

    style Input fill:#fff,stroke:#333,stroke-width:2px
    style Front_End fill:#f9f9f9,stroke:#333
    style Optimizer fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Back_End fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Output fill:#fff,stroke:#333,stroke-width:2px
    style Infra fill:#fff3e0,stroke:#e65100,stroke-dasharray: 5 5