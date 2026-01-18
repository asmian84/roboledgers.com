@echo off
echo Starting migration from G: to C:...
mkdir "C:\Projects\AutoBookkeeping-V4" 2>nul
robocopy "g:\My Drive\AutoBookkeeping\AutoBookkeeping-V4" "C:\Projects\AutoBookkeeping-V4" /E /XD node_modules /R:2 /W:1
echo Migration complete.
