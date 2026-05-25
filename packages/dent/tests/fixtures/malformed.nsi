; === Malformed NSIS Script ===
; Every line below is intentionally ugly to exercise the formatter

; ; wrong keyword casing everywhere
!include "LogicLib.nsh"
!define PRODUCT_NAME "Demo App"

!ifdef PRODUCT_NAME
	!echo "building ${PRODUCT_NAME}"
!endif

; wrong instruction casing
Name "${PRODUCT_NAME}"
OutFile "setup.exe"
Unicode true
RequestExecutionLevel admin
SetCompressor /SOLID lzma
InstallDirRegKey HKLM "Software\Demo" ""
InstallDir "$PROGRAMFILES\Demo"
BrandingText /TRIMLEFT "Installer v1.0"
Caption "Setup"
Icon "icon.ico"
SilentInstall normal
ShowInstDetails show
Target amd64
XPStyle on
ManifestDPIAware true
ManifestSupportedOS WinVista Win7 Win8 Win8.1 Win10
SetDatablockOptimize on
SetDateSave on
SetOverwrite ifnewer
SetCompress auto

; page setup with wrong casing
Page license
Page components
Page directory
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles

; license with wrong flag casing
LicenseForceSelection checkbox

; forward-slash flags with wrong casing
ReserveFile /plugin "nsDialogs.dll"
ReserveFile /NONFATAL "optional.txt"

; multi-line block comment, badly indented
/*
 This is a multi-line
 block comment
 that needs re-indentation
 */

Section "Main Application" SecMain
	SectionIn 1 2
	SetOutPath "$INSTDIR"
	SetOverwrite on
	File /r "dist\*.*"
	CreateShortcut "$DESKTOP\Demo.lnk" "$INSTDIR\app.exe" "" "" "" SW_SHOWNORMAL ALT|CONTROL|SHIFT "F5"
	CreateDirectory "$INSTDIR\data"
	WriteRegStr HKLM "Software\Demo" "InstallDir" "$INSTDIR"
	WriteRegDWORD HKLM "Software\Demo" "Version" 1
	WriteRegExpandStr HKLM "Software\Demo" "Path" "%SystemRoot%\Demo"
	WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; badly indented section with wrong casing for everything
SectionGroup "Optional Components" SecGroup
	Section "Plugin A" SecPlugA
		AddSize 1024
		SetOutPath "$INSTDIR\plugins"
		File "pluginA.dll"
		RegDLL "$INSTDIR\plugins\pluginA.dll"
	SectionEnd

	Section "Plugin B" SecPlugB
		SetOutPath "$INSTDIR\plugins"
		File "pluginB.dll"
	SectionEnd
SectionGroupEnd

; function with deeply nested logic, all flat
Function .onInit
	InitPluginsDir
	; check for running instance
	FindWindow $0 "" "Demo App"
	IntCmp $0 0 not_running
	MessageBox MB_OK|MB_ICONEXCLAMATION "Application is running!" /SD IDOK
	Abort
	not_running:

	; nested conditionals — all flush left
	${If} $LANGUAGE == 1033
	${OrIf} $LANGUAGE == 1031
		StrCpy $1 "supported"
	${Else}
		StrCpy $1 "unsupported"
	${EndIf}

	; switch block — wrong indentation
	${Switch} $1
		${Case} "supported"
			DetailPrint "Language is supported"
			${Break}

		${CaseElse}
			DetailPrint "Language is not supported"
			${Break}
	${EndSwitch}

	; loop — flat
	${For} $R0 1 10
		DetailPrint "Iteration $R0"
	${Next}

	; do-while — flat
	${Do}
		Sleep 100
		IntOp $R1 $R1+1
	${LoopUntil} $R1 >= 5
FunctionEnd

; uninstall section
Section "Uninstall"
	SetDetailsPrint both
	SetShellVarContext all
	Delete /REBOOTOK "$INSTDIR\app.exe"
	Delete "$INSTDIR\uninstall.exe"
	RMDir /r "$INSTDIR\plugins"
	RMDir "$INSTDIR"
	DeleteRegKey HKLM "Software\Demo"
	; message box with compact pipe flags and wrong casing
	MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Remove user data?" IDYES remove_data
	Goto done
	remove_data:
	RMDir /r "$APPDATA\Demo"
	done: ; end of uninstall
SectionEnd

; function with file I/O and error handling
Function WriteConfig
	ClearErrors
	FileOpen $0 "$INSTDIR\config.ini" w
	IfErrors config_error
	FileWrite $0 "key=value$\r$\n"
	FileClose $0
	Goto config_done
	config_error: ; handle file errors
	SetDetailsView show
	DetailPrint "Could not write config file"
	config_done:
FunctionEnd

; compiler conditionals — deeply nested, flat
!ifdef ENABLE_LOGGING
	!if 1 == 1
		LogSet on
	!else
		LogSet off
	!endif
!endif

; IntOp compact operators (all forms)
Function MathDemo
	IntOp $0 $1+$2
	IntOp $0 $1-$2
	IntOp $0 $1+-$2
	IntOp $0 $1*$2
	IntOp $0 $1/$2
	IntOp $0 $1%$2
	IntOp $0 $1|$2
	IntOp $0 $1&$2
	IntOp $0 $1^$2
	IntOp $0 $1||$2
	IntOp $0 $1&&$2
	IntOp $0 $1<<$2
	IntOp $0 $1>>$2
	IntOp $0 ~$1
	IntOp $0 !$1
	IntPtrOp $0 $0+${NSIS_MAX_STRLEN}
FunctionEnd

; MessageBox pipe spacing variants
Function PipeDemo
	MessageBox MB_OK|MB_DEFBUTTON1 "compact"
	MessageBox MB_OK |MB_DEFBUTTON1 "right-attached"
	MessageBox MB_OK|MB_DEFBUTTON1 "left-attached"
	MessageBox MB_OK|MB_DEFBUTTON1 "spaced"
	MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "multi-pipe" IDYES label1
	label1:
FunctionEnd

; various parameter casing corrections
Function ParamDemo
	SetFileAttributes "$INSTDIR\readme.txt" READONLY|ARCHIVE
	FileSeek $0 0 SET
	GetWinVer $0 MAJOR
	ShowWindow $HWNDPARENT SW_HIDE
	LockWindow on
	SetCtlColors $0 transparent
	SetSilent silent
	SetRegView default
	SetAutoClose true
	DirVerify auto
	SetDetailsPrint listonly
	AddBrandingImage left 50
	InstProgressFlags smooth colored
	ExecShell open "$INSTDIR\readme.txt"
FunctionEnd

; PageEx block
PageEx license
	LicenseData "license.txt"
	LicenseForceSelection radiobuttons
PageExEnd

; no trailing newline on last line
!verbose 4
