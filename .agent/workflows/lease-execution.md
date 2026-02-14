---
description: How to deploy and test the LeaseExecution flow
---

## 1. Deploy the Supabase Edge Function
To deploy the lease execution function, run:
```bash
supabase functions deploy lease-execution
```

## 2. Run Database Migrations
Ensure the `leases` table is updated with the required fields:
```bash
supabase db push
```

## 3. Testing the Flow
1. Open the app as a Landlord.
2. Go to the **Lead Dashboard**.
3. Find a lead with status "Viewing Scheduled".
4. Change the status to **"Lease Sent"**.
5. Check the `leases` table in the Supabase Dashboard to see if a record was created with an `envelope_id` and status `sent_for_signature`.
