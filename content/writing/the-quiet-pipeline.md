---
title: The Quiet Pipeline
deck: On building software that runs while you're not looking, and the discipline of writing nothing you can't replay.
date: 2026-03-28
read: 14
words: 3812
tag: infrastructure
tags: [infrastructure, philosophy, local-first]
featured: true
relatedProjects: [git-viewer, bilko-run]
pulls:
  - "If your pipeline can't be killed mid-step and resumed without remorse, it isn't a pipeline. It's a fragile script wearing a uniform."
  - "Every job should write its intent before it acts. The intent is the contract; the action is the side effect."
  - "Logs are a debugging tool. Artifacts are the actual product."
---

There is a particular satisfaction in the kind of system that does not need you. It runs at 3 a.m., on a machine you forgot you owned, and it leaves a small trail of artifacts in a directory you'll read tomorrow over coffee. It does not page you. It does not ask. If something has gone wrong, it has — quietly, and reversibly — written down what it was about to do, so that you can pick up the thread without having to ask the system what it remembers.

I've spent the last two years thinking about this kind of software. The orchestrator I write for git-viewer is, I think, the clearest expression of the idea. The web service is the easy half — it just renders. The hard half is the local pipeline: the work-horse, the data processor, the thing that scans every repository on my disk every night and decides what to recompute.

What I want to write down here is the discipline of the quiet pipeline.
