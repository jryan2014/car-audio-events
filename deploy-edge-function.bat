@echo off
echo Deploying Email Edge Function...
echo.

cd /d E:\2025-car-audio-events\car-audio-events

echo Logging in to Supabase (if needed)...
call npx supabase login

echo.
echo Deploying process-email-queue function...
call npx supabase functions deploy process-email-queue --no-verify-jwt

echo.
echo Deployment complete!
echo.
echo To check if it worked, look at the logs:
echo npx supabase functions logs process-email-queue --tail

pause