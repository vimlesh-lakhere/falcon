# PROJECT FALCON
# AGS Store ERP
# Master AI Coding Guide
Version: 1.0

---

# Purpose

This document defines the mandatory engineering rules, implementation workflow, and coding standards for building AGS Store ERP.

Every AI coding agent (Antigravity, Claude Code, Cursor, Windsurf, etc.) MUST follow this document together with:

- Product Requirements Specification (PRD)
- Technical Architecture & Database Specification
- UI/UX & Design System Specification
- API & Backend Specification
- Development Roadmap

This document is the implementation contract.

---

# Project Goal

Build a production-ready AI-powered ERP system for AGS Store.

The system should initially support one shop but must be designed to scale to:

- Multiple Shops
- Multiple Warehouses
- Multiple Users
- Customer Mobile App
- AI Business Assistant

---

# Technology Stack

Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend
- Supabase
- PostgreSQL
- Row Level Security
- Supabase Auth
- Supabase Storage
- Realtime

Deployment
- GitHub
- Vercel
- Supabase

---

# Non-Negotiable Rules

AI MUST NOT:

- redesign architecture
- rename folders
- change database schema without approval
- hardcode values
- skip validation
- duplicate business logic
- mix UI and business logic
- write temporary hacks
- leave TODOs in production code

AI MUST:

- follow Clean Architecture
- use reusable components
- use strict TypeScript
- keep code modular
- keep business logic reusable
- optimize performance
- support mobile and desktop
- write maintainable code

---

# Folder Structure

Every new feature must follow:

app/
components/
features/
lib/
hooks/
services/
repositories/
types/
utils/
constants/
database/
styles/
tests/

Never create random folders.

---

# Coding Standards

Always:

- Use TypeScript strict mode
- Prefer composition over inheritance
- Keep components small
- Separate UI from logic
- Keep files focused
- Use descriptive names
- Remove dead code
- Avoid unnecessary dependencies

---

# Feature Development Workflow

Every feature MUST follow the same process.

Step 1

Explain:

- feature purpose
- dependencies
- implementation approach

Step 2

List files to create.

Step 3

List files to modify.

Step 4

Implement.

Step 5

Explain implementation.

Step 6

Provide manual testing steps.

Step 7

Wait for approval before moving to the next major feature.

---

# UI Rules

Every page MUST include:

Loading State

Empty State

Error State

Success State

Permission State

Responsive Layout

Keyboard Navigation

Accessibility

---

# Forms

Every form MUST include:

Validation

Loading

Error Messages

Success Feedback

Disable Duplicate Submit

Focus Handling

Reset Handling

---

# Tables

Every table MUST support:

Sorting

Filtering

Search

Pagination

Responsive Layout

Bulk Selection

Column Visibility

Export

---

# Database Rules

Never query tables directly from UI.

Always:

UI

↓

Service

↓

Repository

↓

Supabase

Database changes MUST use migrations.

Never modify production schema manually.

---

# Authentication Rules

Every protected page MUST:

Verify authentication

Verify permissions

Redirect unauthorized users

Never expose restricted data

---

# Authorization Rules

Roles:

Owner

Manager

Cashier

Inventory Staff

Every action MUST verify permissions before execution.

---

# Error Handling

Never show raw errors.

Use:

User-friendly message

Technical log

Retry option

Fallback state

---

# Logging

Log:

Authentication failures

Permission failures

Stock adjustments

Price changes

Purchase approvals

Refunds

Deleted records

Settings changes

---

# Security

Always:

Validate input

Escape output

Protect secrets

Use HTTPS

Follow RLS

Prevent SQL Injection

Prevent XSS

Never expose API keys

---

# Performance

Always:

Lazy load pages

Optimize images

Debounce search

Paginate tables

Avoid unnecessary re-renders

Cache where appropriate

---

# POS Rules

POS is the highest priority module.

Must support:

Fast keyboard workflow

Barcode scanner

Customer search

Price override

Discount

Multiple payment methods

Receipt generation

Stock deduction

Transaction history

Hold bill

Resume bill

Offline-safe architecture

---

# Inventory Rules

Every inventory update MUST create:

Inventory Movement

Audit Log

Timestamp

User

Reason

---

# Customer Rules

Customer profile must include:

Orders

Sales

Outstanding balance

Custom prices

Requested products

Notes

---

# Purchase Rules

Receiving purchases MUST:

Increase stock

Update supplier history

Create inventory movement

Update purchase status

---

# AI Development Order

Never build randomly.

Follow this exact order.

Phase 1

Foundation

Phase 2

Authentication

Phase 3

Database

Phase 4

Products

Phase 5

Categories

Phase 6

Inventory

Phase 7

Suppliers

Phase 8

Purchases

Phase 9

Customers

Phase 10

Customer Requests

Phase 11

POS

Phase 12

Sales

Phase 13

Orders

Phase 14

Reports

Phase 15

Analytics

Phase 16

Settings

Phase 17

AI Center

Phase 18

Optimization

Phase 19

Testing

Phase 20

Deployment

---

# Before Completing Any Feature

AI MUST verify:

✓ Responsive

✓ Mobile Friendly

✓ Desktop Friendly

✓ No TypeScript Errors

✓ No ESLint Errors

✓ No Build Errors

✓ Loading State

✓ Error State

✓ Empty State

✓ Permission Check

✓ Validation

✓ Accessibility

✓ Performance

---

# Done Definition

A feature is complete ONLY when:

- UI finished
- Backend finished
- Validation finished
- Permissions finished
- Responsive
- Accessible
- Tested
- Production Ready

---

# Final Rule

Never implement multiple major modules simultaneously.

Always complete one module entirely before starting the next.

Implementation order is mandatory.

If a requirement is unclear, STOP and ask before making architectural decisions.

The objective is to build a long-term, scalable ERP—not a prototype.