; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "SoundShare"
#define MyAppVersion "2025.02.19"
#define MyAppPublisher "UMUTech"
#define MyAppURL "https://umutech.com/"
#define MyAppExeName "SoundShare.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{C78200F2-5467-4724-B944-00353FD08796}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppPublisher}\{#MyAppName}
DisableDirPage=yes
UninstallDisplayIcon={app}\bin\{#MyAppExeName}
; "ArchitecturesAllowed=x64compatible" specifies that Setup cannot run
; on anything but x64 and Windows 11 on Arm.
ArchitecturesAllowed=x64compatible
; "ArchitecturesInstallIn64BitMode=x64compatible" requests that the
; install be done in "64-bit mode" on x64 or Windows 11 on Arm,
; meaning it should use the native 64-bit Program Files directory and
; the 64-bit view of the registry.
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
; Remove the following line to run in administrative install mode (install for all users).
; PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputBaseFilename=SoundShareSetup_v{#MyAppVersion}
SignTool=UMU
SolidCompression=yes
WizardStyle=modern

[Code]
const
  NET_FW_ACTION_ALLOW = 1;
  NET_FW_RULE_DIR_IN = 1;
  NET_FW_PROFILE2_DOMAIN = 1;
  NET_FW_PROFILE2_PRIVATE = 2;
  NET_FW_PROFILE2_PUBLIC = 4;
  NET_FW_PROFILE2_ALL = NET_FW_PROFILE2_DOMAIN or NET_FW_PROFILE2_PRIVATE or NET_FW_PROFILE2_PUBLIC;

procedure AddFirewallRule(const Name, Path: string);
var
  FwPolicy, FwRule, Rules: Variant;
  AppPath: WideString;
begin
  try
    FwPolicy := CreateOleObject('HNetCfg.FwPolicy2');
    Rules := FwPolicy.Rules;

    FwRule := CreateOleObject('HNetCfg.FwRule');
    AppPath := Path;

    FwRule.Name := Name;
    FwRule.Description := 'Allow ' + Name;
    FwRule.ApplicationName := AppPath;
    FwRule.Enabled := True;
    FwRule.Action := NET_FW_ACTION_ALLOW;
    FwRule.Direction := NET_FW_RULE_DIR_IN;
    FwRule.Profiles := NET_FW_PROFILE2_ALL;

    Rules.Add(FwRule);
  except
    MsgBox('Failed to add firwall rule!', mbError, MB_OK);
  end;
end;

procedure RemoveFirewallRule(const Name: string);
var
  FwPolicy, Rules, Rule: Variant;
  Count, i: Integer;
begin
  try
    FwPolicy := CreateOleObject('HNetCfg.FwPolicy2');
    Rules := FwPolicy.Rules;

    Count := Rules.Count;
    for i := 1 to Count do
    begin
      try
        Rule := Rules.Item(Name);
        if Rule.Name = Name then
        begin
          Rules.Remove(Name);
        end;
      except
        break;
      end;
    end;
  except
    MsgBox('Failed to remove firwall rule!', mbError, MB_OK);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    AddFirewallRule('Regame_SoundShare', ExpandConstant('{app}\bin\{#MyAppExeName}'));
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    RemoveFirewallRule('Regame_SoundShare');
  end;
end;

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: ".\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\bin\avutil-59.dll"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: ".\bin\{#MyAppExeName}"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: ".\bin\{#MyAppExeName}.en-US.mui"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: ".\bin\{#MyAppExeName}.zh-CN.mui"; DestDir: "{app}\bin"; Flags: 
Source: ".\bin\swresample-5.dll"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: ".\bin\WebView2Loader.dll"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: ".\conf\*"; DestDir: "{app}\conf"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\licenses\*"; DestDir: "{app}\licenses"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\root\*"; DestDir: "{app}\root"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\bin\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\bin\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\bin\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

