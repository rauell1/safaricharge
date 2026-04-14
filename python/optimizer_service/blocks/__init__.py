"""Block-structured Pyomo model components.

Each module here defines one Level-1 block (asset) with its own Pyomo
Vars, Params, and Constraints. The orchestrator in optimizer.py assembles
them into a ConcreteModel and adds the Level-2 energy balance block.
"""
