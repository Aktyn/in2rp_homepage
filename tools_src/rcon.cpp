#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <netdb.h>
#include <cstdlib>
#include <stdio.h>
#include <string.h>

#include <iomanip>
#include <iostream>
#include <string>

using namespace std;

int main(const int args_len, const char** args) {
	if(args_len < 5) {
		cout << "Usage:" << endl << "rcon server_ip port rcon_password command" << endl;
		return 0;
	}

	const char* ip = args[1];
	const unsigned int port = atoi(args[2]);

	string command = args[4];
	for(int i=5; i<args_len; i++) {
		command += " ";
		command += args[i];
	}

	struct sockaddr_in myaddr;
	int sock;

	//Construct the server sockaddr_ structure
	memset(&myaddr, 0, sizeof(myaddr));
	myaddr.sin_family = AF_INET;
	myaddr.sin_addr.s_addr = htonl(INADDR_ANY);
	myaddr.sin_port = htons(0);

	if((sock=socket(AF_INET, SOCK_DGRAM, 0))<0) {
		cout <<  "Failed to create socket";
		exit(EXIT_FAILURE);
	}

	if(bind(sock, (struct sockaddr*)&myaddr, sizeof(myaddr)) < 0) {
		cout << "bind failed";
		exit(EXIT_FAILURE);
	}

	inet_pton(AF_INET, ip, &myaddr.sin_addr.s_addr);
	myaddr.sin_port = htons(port);

	string s = string("\xFF\xFF\xFF\xFFrcon ") + args[3] + " " + command;

	//send the message to server
	if(sendto(sock, s.c_str(), s.size(), 0, (struct sockaddr *)&myaddr, sizeof(myaddr)) != s.size()) {
		cout << "Mismatch in number of bytes sent" << endl;
		exit(EXIT_FAILURE);
	}

	//Receive the datagram back from server
	int addrLength(sizeof(myaddr)),received(0);
	char buffer[1024] = {0};
	if((received=recvfrom(sock, buffer, 1024, 0, (sockaddr *)&myaddr, (socklen_t*)&addrLength)) < 0) {
		cout << "Mismatch in number of bytes received" << endl;
		exit(EXIT_FAILURE);
	}
	buffer[received] = '\0';

	char result[1024] = {0};
	const size_t offset = 10;
	memcpy(result, buffer+offset, sizeof(char) * (received-offset));

	cout << result;
	close(sock);

	return 0;
}