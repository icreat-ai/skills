# Skill Evaluation Notes

Run the scenarios in [scenarios.md](./scenarios.md) against an MCP-enabled Agent after changing model routes, upload behavior, or task recovery rules.

Success means the Agent uses iCreat MCP, checks the live catalog, preserves model fidelity, retries only a confirmed pre-acceptance failure of the exact requested model for at most three total attempts, and does not create or seek a substitute result when configuration, uploads, or generation fail.
