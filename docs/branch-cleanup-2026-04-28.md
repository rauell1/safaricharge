# Branch Cleanup — 2026-04-28

All branches below were deleted from `rauell1/safaricharge` on 2026-04-28 as part of a repository cleanup.
`main` was retained as the sole branch.

## Rollback Instructions

To restore any deleted branch locally:
```bash
git fetch origin
git checkout -b <branch-name> <sha>
# optionally push it back:
git push origin <branch-name>
```

To restore on GitHub (requires push access):
```bash
git push origin <sha>:refs/heads/<branch-name>
```

---

## main HEAD at time of cleanup
| Branch | SHA |
|---|---|
| `main` | `49895f5e491273cdd40fd9779e1179a2f48f38db` |

---

## Deleted Branches

### assistant/
| Branch | Last Commit SHA |
|---|---|
| `assistant/fix-battery-soc-dashboard` | `08434cdd13033391bf89d361ae4c58fef326c3b0` |
| `assistant/fix-battery-soc-physics` | `08434cdd13033391bf89d361ae4c58fef326c3b0` |

### claude/
| Branch | Last Commit SHA |
|---|---|
| `claude/fix-ai-request-status-500` | `0b370b17663627bd4d8dd83317ec93efc86f86bb` |
| `claude/fix-investor-dashboard-simulation-visualization` | `0a2d5fd89de9443845a79e85680eba27bee61d90` |
| `claude/fix-system-visualization-small-devices` | `33211acf8da988010077f0737f26e2e0c46373c3` |
| `claude/fix-ui-mobile-system-visualization` | `b2da6e7d866d957db7bab7b752181aa56805f53b` |
| `claude/improve-mobile-layout-icons` | `246b20acf7450cf39345dd023ec6c1044028b012` |
| `claude/improve-ui-visualization` | `999092a04888a8c0aceb0966f8a5ee4fad2506a5` |
| `claude/install-gitnexus-and-serve` | `e77c46861aee8ee74d622cf2b2fdc59d2d206abd` |
| `claude/install-zai-sdk` | `89f8aaca0430bcbc1b3e1c1dd3259de7bdb4cd95` |
| `claude/investigate-pdf-generation-issues` | `c3c76b6a39bb1f5d15ec2cddcd24028e6910e207` |
| `claude/npx-autoskills` | `e9d7408257c3ab1536745074c619c8b41d6b0193` |
| `claude/update-energy-flow-visualization` | `c26c4b1ad3a570f39a9879114fed79369f2ac215` |
| `claude/upgrade-solar-dashboard-configuration` | `6ff0ce93b57874985d838243a6bb1059a0fd90d1` |
| `claude/upgrade-ui-ux-design` | `5dd1db95fc3806c8c6a02b25c862b68038988d5b` |

### codex/
| Branch | Last Commit SHA |
|---|---|
| `codex/add-battery-health-score-card-ui` | `9832cebf709aea8693fb8d7b9432f4ee5468e3a4` |
| `codex/add-industrial-icon-to-energy-flow-diagram` | `fe64e7fcba78eaffe836d80376e1f5b5add7088f` |
| `codex/add-slider-carousel-to-system-visualization` | `2be6b6f09afc679bfb33602a028e63f27c5f3d7e` |
| `codex/add-smart-grid-integration-layer` | `63bcdd6981f488ff43484120a948dcf3f7cd9426` |
| `codex/analyze-research-for-ev-grid-utilization-ideas` | `d9fdba28fae6620aa08c1eb199f3f38fa1bf2a1b` |
| `codex/audit-technical-aspects-of-safaricharge` | `22bdefb1144afe56703ce5d9c6e22ae215c57c11` |
| `codex/clean-up-components-knowledge-base` | `cd093a1caaf464de1dc276030bc6c099049e28be` |
| `codex/cleanup-solar-component-ui` | `efa1909e86b29e21dc73b4f2e522487c9726a40a` |
| `codex/conduct-full-stack-security-and-performance-audit` | `19543c6c570cc2bdb4dda93d5fc81b011ce547b5` |
| `codex/debug-dashboard-error` | `f3420ee22acf8111a887c2c1ef1095e28ba1fdae` |
| `codex/find-cause-of-ai-and-pdf-generation-error` | `c8137ce859c97fc0e23a5ba83eca1c7a61cb9b1` |
| `codex/fix-ai-functionality-issues` | `559083113420738d743a75674f69f9ec39f7696c` |
| `codex/fix-commercial-load-toggle-issues` | `4bb53c2d6cb0f4adfddb9ba777daa1c9b65a8127` |
| `codex/fix-jacking-issue-and-improve-inputs` | `f7aaf9c757d950b6d2e56c732e072c92e6b914aa` |
| `codex/fix-login-page-layout-and-dropdown-visibility` | `6f1660489e4dae38e557ab37721c63b30c2a282e` |
| `codex/install-verify-zai-sdk` | `28d3155f1d3ac98833286bf95dc33523a0450a4a` |
| `codex/investigate-issues-after-last-commits` | `dfb79087a73445133d661c7a78664a79427a5b1e` |
| `codex/investigate-recent-commits-for-issues` | `316bd8eea089e9ea14860053a27decd90c121ebb` |
| `codex/make-energy-flow-visible` | `e6d3b2986af79bcf35745d985b359b2d47043249` |
| `codex/nextjs-build-deployment` | `39bb17d5a73d7dfbe44ba8cc140587ca9f311640` |
| `codex/optimize-dashboard-interface` | `2fc81f5c4b2b60011250c0cf0d74085d07d888b0` |
| `codex/perform-full-audit-and-improvements` | `a23802b9e6bf0d94f7826530f336d045546d6a4d` |
| `codex/properly-space-icons-and-improve-ui-layout` | `ddfab6ac3d5bd686256cfb8972a3f330803dfa62` |
| `codex/redesign-mobile-dashboard-layout` | `f12a0d5e13430c8eba7f7b6b188535ccf80e77c5` |
| `codex/redesign-system-visualization-ui` | `bfd7d4e44cbfac92aae2d9125a3fb13bb26ad140` |
| `codex/refactor-authentication-system` | `c7823a9c645df4108a1313eb856f43eadaad950f` |
| `codex/remove-idle-code-and-clean-dashboard` | `d79ef109236e8c83ca838fe80a4bf3b983094f5c` |
| `codex/replicate-energy-flow-design-for-mobile` | `941070f4bbe11bf86b7c28eb977e0ba3a6c6f9e1` |
| `codex/stop-section-shifting-during-simulation` | `6b713d66d28d3074b23df3579f9ad62a3ac38df5` |
| `codex/update-nextjs-version` | `e50d4bcf34ca5b72f293235a1df658f4b417f92a` |
| `codex/update-nextjs-version-16-1-6` | `d7663fef78a33421cd0ea0e94b784832c67c4639` |
| `codex/update-readme-based-on-file-contents` | `a057a38ef3474b4ad829ec0423a445aac44ddc13` |
| `codex/update-ui-for-knowledge-base-component` | `c74f499a3e7100457945e1dabcea04ab4c404ade` |
| `codex/visualization-page-mobile-view` | `2af16d868353fb21f9b2498f0402c630eefb302c` |

### copilot/
| Branch | Last Commit SHA |
|---|---|
| `copilot/add-battery-simulation-engine` | `948ad0cc8af7b58d67b787c4dfa113930ccce64d` |
| `copilot/add-charts-zip-download-option` | `59764ec80785719e512e223bde4c89d6068cad28` |
| `copilot/add-configurable-performance-ratio` | `1b18556126ff535d0464b68341a828c9b9b3911c` |
| `copilot/add-docs-grid-resilience-ev-charging` | `d9b0a7577845cd34f30e26938aa800d22a63bcbd` |
| `copilot/add-energy-intelligence-page` | `fd8c409a4c19d7219ff4ad481a4e03bf9c476d98` |
| `copilot/add-ev-charging-controls` | `e4570c0024237e7d275bbdb2a7c26f595267dfe1` |
| `copilot/add-fastapi-validation-harness` | `4e4d239aba105b4ab6e7ce4e1134e0b8c1fcb76d` |
| `copilot/add-financial-modeling-engine` | `f3f133717cfb6115b10a66ae4e64371476be6390` |
| `copilot/add-forecasting-service` | `d81154a6a90384047a43e3e00cfea97510a2707f` |
| `copilot/add-inverter-simulation-module` | `8a977b1e5334a4867724c507b2768a5900fff016` |
| `copilot/add-on-grid-off-grid-simulation-paths` | `67508fd36b81abbabc41e7f4274259debc0b3089` |
| `copilot/add-pv-sizing-calculator` | `28c26f5c5fda85a0932680e4f0d3d1e64020566c` |
| `copilot/add-save-scenario-button` | `f7109625ed921a4302483d094c8718cdb9733f5b` |
| `copilot/add-social-impact-dashboard-panel` | `2981023afdb11decb29f0763f9c04808d34e7135` |
| `copilot/add-user-signup-functionality` | `7247d59cf91f3d2a7b48e575262f688870fd4e2b` |
| `copilot/add-user-signup-workflow` | `06c478166442e1a19d2165bee35c0da1b8c6fa4e` |
| `copilot/add-vercel-plugin` | `6a57e3bef110132e7cfba2071b70ddb0261c3b0e` |
| `copilot/audit-remove-dead-code` | `a82d1fe6d01fd0617e349582fddc82237557dff3` |
| `copilot/debug-dashboard-error` | `f3420ee22acf8111a887c2c1ef1095e28ba1fdae` |
| `copilot/design-self-updating-map-system` | `cb5ff01b2a559fcd4e9bb8031d98227fbea0a2ff` |
| `copilot/feat-ev-mobility-simulation-engine` | `6f233d82ef8d57975348119000f674c40653cae0` |
| `copilot/feat-scenario-management-save-list-compare` | `aa30f66b707b5e9080f247899fc6749eb8f3d42d` |
| `copilot/feat-upgrade-csv-excel-export` | `01d439905d58d7d916bd33a25b868b61a76ae174` |
| `copilot/fix-ai-assistant-page-crash` | `90ed313574aca4ef7c6eb76c3a719cb7f0b39b9f` |
| `copilot/fix-battery-soc-issue` | `ba54f6450b8f99328a8a68a7f612627cd560c9d9` |
| `copilot/fix-ci-issues-lint-type-check` | `29e19a795a25bc5c1feca2bdf979ff8b7c75d002` |
| `copilot/fix-cleanliness-issue` | `a7b428302ae3d0311b296268903c48eebda0478f` |
| `copilot/fix-damaged-lockfile` | `dd06fa78e5ce577fe80cd507f034f861a5169992` |
| `copilot/fix-error-in-investor-dashboard` | `dd5898e9170ac2fb1584daeb8be32e8718cb436e` |
| `copilot/fix-graph-data-point-issues` | `d363260b4ac6be59c3ff86e2f856a3eb9d508754` |
| `copilot/fix-invalid-lockfile-warning` | `83008b0e848d64cf9ef0ec4898ef3cd1f7d5cf20` |
| `copilot/fix-investor-dashboard-simulation-visualization` | `aae1e77a26000ce259a59079394ebb3c0c98aa90` |
| `copilot/fix-missing-scroll-wrapper` | `62eafa08314a38b923e775ad74574c90611d3b2b` |
| `copilot/fix-mount-engineering-kpis-card` | `04ca6ff7ea20232072a45d61935c4ff21ae5c792` |
| `copilot/fix-scenarios-sidebar-navigation` | `ffb268faccf930b855248ef601ad66867ae06ea2` |
| `copilot/fix-signup-page-visual-issues` | `19b7b999ba7f0cd0f8311acaf9af4604a6320156` |
| `copilot/fix-simulation-investor-pages` | `6b22437ef437711fed12b0bb6761fd79a7392df9` |
| `copilot/optimize-dashboard-ui` | `78029ad32195f0b4635f0b57fe1fa5dc6d80eafd` |
| `copilot/refactor-authentication-system` | `341130a29cb0620e0fe688d03c3a78a9c1c4e287` |
| `copilot/refactor-without-breaking-functionality` | `40d394a179b1cc2c41118735f7ed9e8d9794e4ce` |
| `copilot/regenerate-package-lock-json` | `c433f4814edbfa344490068e91dcc5ef270d319b` |
| `copilot/remove-duplicate-gaussian-random-and-8-components` | `f8f631781378bd6986552b32bbfc6fcc2fe28d06` |
| `copilot/restore-previous-dashboard-functionality` | `86ba8509050d0255660ecfaa84c29a811fd8d92e` |
| `copilot/revamp-safaricharge-landing-page` | `6f888b31a21a3d5ed68bd29a2de33b82368866e2` |
| `copilot/revert-to-pr-168` | `3db1daa9104c0e78508050e5d31aea0f6f3aaa8c` |
| `copilot/run-vercel-build` | `6bdcd5089ef24e312d9a1589a78a583175a9ab3e` |
| `copilot/safaricharge-landing-page-login-form` | `05cc8ab87e56494ac2d010ce7ef456f8d5875a9d` |
| `copilot/troubleshoot-ongoing-issues` | `e182976ab954d0c4269ade89673278def121e2a2` |
| `copilot/ui-typography-improvements` | `78057b495955a114ddad6468daf68ff549d6a1ee` |
| `copilot/update-rauell1-readme` | `0d40bb706ebca7bd64caf03b5353de4bb93cc3b7` |
| `copilot/upgrade-safaricharge-dashboard` | `600f204d339f17f3ea99671c8a18ccb2ea758f90` |
| `copilot/visualize-energy-flow-system` | `ca68c3c92b055b9ed0a4c2574bcad74eabb9eddf` |

### feat/
| Branch | Last Commit SHA |
|---|---|
| `feat/auth-session-ttl-onboarding` | `0c11dfac8bc08d32e630b53743a88160395c352c` |
| `feat/codebase-audit-improvements` | `ee3f996aad10d99e02da630f4672f0fb82e1fe24` |
| `feat/dark-light-mode-ai-panel-perf` | `d93620cffd41bb6d56a5e3374625ee86f78be0a1` |
| `feat/deploy-landing-iot` | `8133d70df7e47a999bd0eae1e33860ecab4302d5` |
| `feat/engineering-kpi-card` | `8a5753558b1354fa404132acf2291010135a6556` |
| `feat/engineering-kpis` | `48eca8f21228ef542c7e9054d8232b77849751f3` |
| `feat/engineering-kpis-card` | `3cbc871b7727a0c93d79f07e3e2dcae128795700` |
| `feat/engineering-kpis-self-sufficiency` | `11668f00c9e3e9c2c3aeed0b1d6ec32838bd7e98` |
| `feat/ev-charging-controls` | `67eee8537162210ef845adc669cb80618f983453` |
| `feat/forecasting-backend` | `bd41e5ff63e10d5bd80d082c343c8dbeb28db139` |
| `feat/kpis-e-april26` | `cc387d5713a4c8818715eb32613f1e75b1899a30` |
| `feat/landing-and-login-pages` | `0a8a885a7fd1e1ee8a5b2e8ed1307d27848c199a` |
| `feat/login-oauth-providers` | `a1da1d82932b7a3da41f627ddc5b42cdf90bcf44` |
| `feat/power-quality-ride-through-research` | `9452b0643649cb3f2351584d39f9bce613090243` |
| `feat/pv-load-forecast-service` | `1528b497cec32184314ae8549ef3637c574f8d47` |
| `feat/pv-sizing-to-config` | `942cf7971e6c233176bb518d6ac3e42d426b706e` |
| `feat/pvlib-sam-validation-harness` | `dec131fe956393dffb7b9b925ddef6d5427f2e2b` |
| `feat/pvlib-validation-harness` | `26649f2caf67f445fb63c01a88e95151d5040514` |
| `feat/pyomo-dispatch-optimizer` | `ee3f996aad10d99e02da630f4672f0fb82e1fe24` |
| `feat/scenario-comparison-ui` | `5cdaf6a602d17d2b19232e3603d4aad95caf3cff` |
| `feat/scenario-json-import` | `4d30b329803d6d577cf05305f1cce5ac61adbab8` |
| `feat/scenario-management` | `ed07924af856f16acf802df73c09d6670dd54af7` |
| `feat/scenario-manager-ui` | `d63e209b93faaf42b642778ed17ea8afb51b3232` |
| `feat/simulation-controls-and-sld-layout` | `c4e765e2b9881ccd1bc04a5b3eb2a104cb55e567` |
| `feat/simulation-page-live-wiring` | `a83e4129b06c513deb2bbd9f6e6baa17fb7adf46` |
| `feat/single-ev-charger-type` | `21ab7d5fe14aa1a85bf4667228a3c3bdfba87079` |
| `feat/supabase-client-helpers` | `b4ba62372ef7deecdfa8d29666a5698a095e651f` |
| `feat/wire-engineering-kpis-card` | `4126cfc9bc80ca2f677ac1409fde0c4c80d4a607` |
| `feature/pyomo-milp-optimizer` | `b624868912cda59af775e0888d1051b9dc645ca0` |

---
_This file was auto-generated by Perplexity MCP during cleanup. Do not delete._
