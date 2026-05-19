@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script
@REM
@REM Required ENV vars:
@REM JAVA_HOME - Location of a JDK home directory
@REM
@REM Optional ENV vars
@REM MAVEN_BATCH_ECHO - set to 'on' to enable the echoing of the batch commands
@REM MAVEN_BATCH_PAUSE - set to 'on' to enable pausing at the end of the script
@REM MAVEN_OPTS - parameters passed to the Java VM when running Maven
@REM     e.g. to debug Maven itself, use
@REM     set MAVEN_OPTS=-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=8000
@REM ----------------------------------------------------------------------------

@echo off
@rem set %HOME% to equivalent of $HOME
if "%HOME%" == "" (set "HOME=%USERPROFILE%")

@rem Determine the path to the Maven distribution
set "DIRNAME=%~dp0"
if "%DIRNAME%" == "" set "DIRNAME=."
set "APP_BASE_NAME=%~n0"
set "APP_HOME=%DIRNAME%"

@rem Resolve any "." and ".." in APP_HOME to make it shorter
for %%i in ("%APP_HOME%") do set "APP_HOME=%%~fi"

@rem Find the project base directory, i.e. the directory that contains the folder ".mvn".
@rem Fallback to current directory if not found.

set "PROJECT_RLV_DIR="
set "SPARE_DIR=%APP_HOME%"

:findProjectDirectory
if exist "%SPARE_DIR%\.mvn" (
    set "PROJECT_DIR=%SPARE_DIR%"
    goto init
)
set "SPARE_DIR=%SPARE_DIR%\.."
goto findProjectDirectory

:init
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
@rem Decide if current redirect is enabled, and where it goes
set "MAVEN_CMD_LINE_ARGS=%*"

@rem Find Java
if not "%JAVA_HOME%" == "" goto locateJdk
set "JAVA_EXE=java.exe"
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto initMaven
echo.
echo ERROR: JAVA_HOME not found in your environment.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.
echo.
goto error

:locateJdk
set "JAVA_HOME=%JAVA_HOME:"=%"
set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
if exist "%JAVA_EXE%" goto initMaven
echo.
echo ERROR: JAVA_HOME is set to an invalid directory.
echo JAVA_HOME = "%JAVA_HOME%"
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.
echo.
goto error

:initMaven
set "WRAPPER_JAR=%PROJECT_DIR%\.mvn\wrapper\maven-wrapper.jar"
set "WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain"

@rem Download the wrapper jar if it does not exist
if exist "%WRAPPER_JAR%" goto runMaven

echo Downloading Maven Wrapper...
set "DOWNLOAD_URL="
if exist "%PROJECT_DIR%\.mvn\wrapper\maven-wrapper.properties" (
    for /F "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_DIR%\.mvn\wrapper\maven-wrapper.properties") do (
        if "%%A" == "wrapperUrl" set "DOWNLOAD_URL=%%B"
    )
)

if "%DOWNLOAD_URL%" == "" (
    set "DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.4/maven-wrapper-3.3.4.jar"
)

@rem Escape the URL for powershell
set "DOWNLOAD_URL=%DOWNLOAD_URL:\=%"

@rem Use PowerShell to download
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%DOWNLOAD_URL%', '%WRAPPER_JAR%')"
if not "%ERRORLEVEL%" == "0" (
    echo ERROR: Failed to download Maven Wrapper jar.
    echo Please download it manually from %DOWNLOAD_URL% and place it at %WRAPPER_JAR%
    goto error
)

:runMaven
"%JAVA_EXE%" %MAVEN_OPTS% "-Dmaven.multiModuleProjectDirectory=%PROJECT_DIR%" -classpath "%WRAPPER_JAR%" %WRAPPER_LAUNCHER% %MAVEN_CMD_LINE_ARGS%
if "%ERRORLEVEL%" == "0" goto end

:error
set ERROR_CODE=1

:end
@rem update error level
exit /b %ERROR_CODE%
