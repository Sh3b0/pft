from time import sleep
from seleniumbase import BaseCase
# from selenium import webdriver
# from selenium.webdriver.support.ui import WebDriverWait


class UploadTest(BaseCase):

    def test_visible_upload(self):
        self.open("http://pipeft.herokuapp.com/#")

        file_path = "./test_files/pdf-test.pdf"
        self.choose_file("#file-input", file_path)

        code = self.get_text('#invite-link')

        self.open_new_window()
        self.open("http://pipeft.herokuapp.com/r/")
        self.type("#invite-link", code)
        self.click("#connect-button")
        sleep(2)
        download_message = self.get_text('#p')
        print(download_message)
        # self.assert_text("Downloaded 1 file(s)", "#p")


