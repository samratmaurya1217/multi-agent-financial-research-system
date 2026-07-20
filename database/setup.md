# Database Setup Guide

This guide explains how to set up the MongoDB database for the Multi-Agent Financial Research System.

---

## Prerequisites

- MongoDB Atlas account
- MongoDB Compass (optional)
- Git
- Access to the project repository

---

## Create MongoDB Atlas Project

1. Log in to MongoDB Atlas.
2. Create a new project.
3. Create a cluster.
4. Create a database named:

```
financial_research_db
```

---

## Create Collections

Create the following collections:

- users
- workspaces
- documents
- chunks
- metrics
- red_flags
- conversations
- reports
- jobs
- audit_logs
- prompts
- comparisons

---

## Configure Validation

Apply the JSON Schema validation rules for each collection.

---

## Create Indexes

Create the indexes described in `indexes.md`, including:

- Unique indexes
- Compound indexes
- Text indexes
- Vector Search index (chunks)
- TTL indexes

---

## Import Seed Data

Import the JSON files from the `seed_data/` directory into their corresponding collections.

---

## Verify Setup

After importing the data, verify that:

- All collections are created.
- Validation rules are active.
- Indexes are created successfully.
- Seed data is available in each collection.
