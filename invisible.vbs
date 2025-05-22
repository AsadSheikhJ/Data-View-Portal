' This script runs the specified command completely invisibly
' Usage: wscript.exe invisible.vbs [program] [arguments]

If WScript.Arguments.Count >= 1 Then
    Set oShell = CreateObject("WScript.Shell")
    
    ' Combine all arguments after the first one
    args = ""
    For i = 1 To WScript.Arguments.Count - 1
        If i > 1 Then args = args & " "
        args = args & WScript.Arguments(i)
    Next
    
    ' Run the program with arguments completely hidden
    oShell.Run WScript.Arguments(0) & " " & args, 0, False
End If
