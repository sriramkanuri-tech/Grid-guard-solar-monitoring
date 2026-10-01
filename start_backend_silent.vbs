' ======================================================================
' Grid Guard Solar Monitoring - Silent Background Service Runner
' Starts run_backend.bat hidden in the background without a cmd window
' ======================================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
strBatPath = strScriptDir & "\run_backend.bat"

WshShell.Run """" & strBatPath & """", 0, False
Set WshShell = Nothing
Set fso = Nothing
