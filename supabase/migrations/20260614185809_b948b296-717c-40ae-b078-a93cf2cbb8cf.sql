
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_due_payouts(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_plan(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_recharge(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_recharge(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_withdrawal(numeric, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_withdrawal_pin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
