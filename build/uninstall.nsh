!macro customUnInit
  ${ifNot} ${isUpdated}
    InitPluginsDir
    File /oname=$PLUGINSDIR\doodle-desk-uninstall.ps1 "${BUILD_RESOURCES_DIR}\doodle-desk-uninstall.ps1"
    ${If} ${Silent}
      ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\doodle-desk-uninstall.ps1" -Phase Prepare -UserDataPath "$APPDATA\Doodle Desk" -LocalDataPath "$LOCALAPPDATA" -DocumentsPath "$DOCUMENTS" -StatePath "$PLUGINSDIR\doodle-vault-state.json" -CreateBackup' $0
      ${If} $0 != 0
        MessageBox MB_OK|MB_ICONSTOP "Doodle Desk could not prepare the uninstall. Your files have not been removed."
        Abort
      ${EndIf}
    ${Else}
      MessageBox MB_YESNOCANCEL|MB_ICONQUESTION "Back up your Doodle Vault and settings before uninstalling?$\r$\n$\r$\nYes: create a backup in Local AppData and then uninstall.$\r$\nNo: permanently delete the vault and settings.$\r$\nCancel: keep Doodle Desk installed." IDYES makeBackup IDNO skipBackup
      Abort

      makeBackup:
      ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\doodle-desk-uninstall.ps1" -Phase Prepare -UserDataPath "$APPDATA\Doodle Desk" -LocalDataPath "$LOCALAPPDATA" -DocumentsPath "$DOCUMENTS" -StatePath "$PLUGINSDIR\doodle-vault-state.json" -CreateBackup' $0
      ${If} $0 != 0
        MessageBox MB_OK|MB_ICONSTOP "The backup failed. Uninstallation has been canceled and your files were not removed."
        Abort
      ${EndIf}
      MessageBox MB_OK|MB_ICONINFORMATION "Backup created under:$\r$\n$LOCALAPPDATA\Doodle Desk Uninstall Backups"
      Goto prepareDone

      skipBackup:
      ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\doodle-desk-uninstall.ps1" -Phase Prepare -UserDataPath "$APPDATA\Doodle Desk" -LocalDataPath "$LOCALAPPDATA" -DocumentsPath "$DOCUMENTS" -StatePath "$PLUGINSDIR\doodle-vault-state.json"' $0
      ${If} $0 != 0
        MessageBox MB_OK|MB_ICONSTOP "Doodle Desk could not prepare the uninstall. Your files have not been removed."
        Abort
      ${EndIf}

      prepareDone:
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\doodle-desk-uninstall.ps1" -Phase Cleanup -UserDataPath "$APPDATA\Doodle Desk" -LocalDataPath "$LOCALAPPDATA" -DocumentsPath "$DOCUMENTS" -StatePath "$PLUGINSDIR\doodle-vault-state.json"' $0
    ${If} $0 != 0
      MessageBox MB_OK|MB_ICONSTOP "Some Doodle Desk data could not be removed. Check folder permissions and manually remove the Doodle Vault or Doodle Desk data folders."
    ${EndIf}
  ${EndIf}
!macroend
