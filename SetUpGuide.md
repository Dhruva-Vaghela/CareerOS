# CareerOS AI - Set Up 

*** If you are using Windows run these commands:- ***
Steps:-

1. npm install
2. npm install -D cross-env

3. Change package.json line 17 and 18 to the following:-

"dev": "concurrently -k -p \"[{name}]\" -n \"AUTH,PROFILE,GOALS,RESUME,TWIN,WEB\" -c \"blue,green,magenta,yellow,cyan,red\" \"cross-env PORT=3001 npx tsx watch services/auth/src/index.ts\" \"cross-env PORT=3002 npx tsx watch services/profile/src/index.ts\" \"cross-env PORT=3003 npx tsx watch services/career-goals/src/index.ts\" \"cross-env PORT=3004 npx tsx watch services/resume/src/index.ts\" \"cross-env PORT=3005 npx tsx watch services/digital-twin/src/index.ts\" \"npm run dev --workspace=@careeros/web\"",
"dev:services": "concurrently -k -p \"[{name}]\" -n \"AUTH,PROFILE,GOALS,RESUME,TWIN\" -c \"blue,green,magenta,yellow,cyan\" \"cross-env PORT=3001 npx tsx watch services/auth/src/index.ts\" \"cross-env PORT=3002 npx tsx watch services/profile/src/index.ts\" \"cross-env PORT=3003 npx tsx watch services/career-goals/src/index.ts\" \"cross-env PORT=3004 npx tsx watch services/resume/src/index.ts\" \"cross-env PORT=3005 npx tsx watch services/digital-twin/src/index.ts\"",

4. npm run dev