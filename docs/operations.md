# Operations Guide

## System Configuration

- [ ] **Point-in-Time Recovery (PITR)** — Enable PITR in the [Supabase Dashboard](https://supabase.com/dashboard) (Project Settings → Database). Required to recover from bad migrations or accidental data changes in this transactional marketplace.

> **Warning:** Manual backups are not a substitute for PITR. In a transactional marketplace, PITR provides fine-grained recovery to a specific timestamp; manual snapshots cannot reliably restore consistency across multiple tables and concurrent transactions.
