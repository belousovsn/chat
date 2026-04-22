Timeline is available at docs/progress-history.md. Footer has tech stack info.

Used Codex Plus, GPT-5.4 Extra High, full access. Hit limit only once on the first day, had to pause for 1h. Week limit by 1st date was 75% full, then Altman decided to reset it. UPD: final week limit 58% left.

Used caveman skill from the start https://github.com/JuliusBrussee/caveman/blob/main/README.md . Also used strict Typescript rules inspired by this https://github.com/tlbx-ai/MidTerm/blob/main/src/Ai.Tlbx.MidTerm/tsconfig.json

Never read the code, just gave Codex the reqs, he split into tasks. Then had to manage coordinator => agents interconnection with templates/onboarding/lanes. Was not going for parallel, just every task = new agent. I only new agents' nicknames, didn't even check features they do. Found out that Codex creates sub-agents if asked to. 

Backend was done in a day, bugs were non-critical.

Tried full frontend revamp by prompting, didn't help much. Used Paper MCP next to create mirC-like UI assets. Looked like magic. Hit limit on Paper MCP requests before I could gather them to work so continued with screenshots, still decent enough. 

2nd day bug-fixing + deploy. Codex is able to do "manual QA" runs with Playwright. 
Connected agent to DigitalOcean droplet, just gave private SSH key file and IP, agent deployed everything. Domain was ready beforehand. 

Started working on Jabber, full agent mode at this point.

3rd day bux fixing + xmpp. Codebase so large, that one task - one agent. Just preparing for a task takes 1/3 context window. Still one-shots what I ask. 
Hit limit just as finshed xmpp user provisioning, currently behind feature-flag, will turn on later.


chat available at chat.memdecks.com

important! create account with "da_test" login so Jabber admin page is available
