# Skill Evaluation Notes

Run the scenarios in [scenarios.md](./scenarios.md) against an MCP-enabled Agent after changing model routes, upload behavior, or task recovery rules.

Success means the Agent uses iCreat MCP, discovers models dynamically via `list_models` / `get_model_api_doc`, preserves model fidelity, retries only a confirmed pre-acceptance failure of the exact requested model for at most three total attempts, follows the structured error `next_step` instead of bypassing MCP, and does not create or seek a substitute result when configuration, uploads, or generation fail.
