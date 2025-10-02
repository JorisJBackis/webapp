Installing Docker with WSL on Windows 10/11
This note will provide detailed steps and instructions to install Docker and signup for a DockerHub account on Windows with WSL. We will need a DockerHub account so that we can pull images and push the images we will build.

Windows 10 & 11 users will be able to install Docker Desktop if their computer supports the Windows Subsystem for Linux (WSL).

1. Register for a DockerHub account

Visit the link below to register for a DockerHub account (this is free)

https://hub.docker.com/signup

2. Download and install all pending Windows OS updates

3. Run the WSL install script

Note - If you have previously enabled WSL and installed a distribution you may skip to step #7

Open PowerShell as Administrator and run: wsl --install
This will enable and install all required features as well as install Ubuntu.


Official documentation:

https://docs.microsoft.com/en-us/windows/wsl/install#install-wsl-command

4. Reboot your computer

5. Set a Username and Password in Ubuntu

After the reboot, Windows will auto-launch your new Ubuntu OS and prompt you to set a username and password.


6. Manually Installing a Distribution
If for some reason Windows did not prompt you to create a distribution or you simply would like to create a new one, you can do so by running the following command:
wsl --install -d Ubuntu

7. Install Docker Desktop

Navigate to the Docker Desktop installation page and click the Docker Desktop for Windows button:

https://docs.docker.com/desktop/install/windows-install/


8. Double-click the Docker Desktop Installer from your Downloads folder

9. Click "Install anyway" if warned the app isn't Microsoft-verified

10. Click "OK" to Add a shortcut to the Desktop

11. Click "Close" when you see Installation succeeded message

12. Double-click the Docker Desktop icon on your Desktop

13. Accept the Docker Service Agreement

14. Docker Desktop will launch for the first time. Docker Desktop will launch and present you with a tutorial. You are free to skip this.


15. Ensure that WSL Integration is Enabled. In Docker Desktop, click the Settings Gear icon. Then choose Resources, and finally WSL Integration. Make sure that the Enable Integration with my default WSL distro is checked. Also, if you are using multiple distributions, make sure that these additional distros are toggled on:

16. Open your Distro

Using the Windows Search feature in the toolbar, type the name of your distribution (by default it is Ubuntu) and click Open:

17. Check that Docker is working Using the terminal for your distro, run the docker command. If all is well you should see some helpful instructions in the output similar to below:

18. Log in to Docker

Using the terminal for your distro, run the docker login command. You will be prompted to enter the username and password (or your Personal Access Token) you created earlier when registering for a DockerHub account. Once you see Login Succeeded, the setup is complete and you are free to continue to the next lecture.


----------------------------------------------------------------------------

Afterwards, run the command

```docker-compose up --build -d```

it will build your image, then go ahead and visit localhost:3000 and things should be working! if you encounter an error, you have to check the docker desktop terminal

contact Aleksis Lesieur for any further information or if you encounter any kind of error